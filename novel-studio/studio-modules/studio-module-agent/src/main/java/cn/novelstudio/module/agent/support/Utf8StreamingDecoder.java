package cn.novelstudio.module.agent.support;

import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import reactor.core.publisher.Flux;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CoderResult;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;

/**
 * 有状态 UTF-8 解码器：跨 DataBuffer 边界携带不完整的多字节序列，
 * 等价于前端的 {@code new TextDecoder().decode(chunk, { stream: true })}。
 *
 * <p>修复乱码根因：原 {@code new String(bytes, UTF_8)} 按 DataBuffer 独立解码，
 * 当 3 字节 CJK 字符被 TCP 分包切到两个 DataBuffer 时，首尾各产生一个 U+FFFD，
 * 聚合后无法恢复。本解码器在 {@code endOfInput=false} 下保留残余字节，下一块拼接后继续解码。
 */
public final class Utf8StreamingDecoder {

    private final CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPLACE)
        .onUnmappableCharacter(CodingErrorAction.REPLACE);

    private byte[] carry = new byte[0];

    private Utf8StreamingDecoder() {}

    /** 将 DataBuffer 流解码为 String 流，保留跨块的多字节字符完整性。 */
    public static Flux<String> decode(Flux<DataBuffer> buffers) {
        Utf8StreamingDecoder instance = new Utf8StreamingDecoder();
        return buffers
            .concatMap(instance::decodeOne)
            .concatWith(Flux.defer(instance::flushTail));
    }

    private Flux<String> decodeOne(DataBuffer dataBuffer) {
        try {
            byte[] bytes = new byte[dataBuffer.readableByteCount()];
            dataBuffer.read(bytes);

            byte[] combined = new byte[carry.length + bytes.length];
            System.arraycopy(carry, 0, combined, 0, carry.length);
            System.arraycopy(bytes, 0, combined, carry.length, bytes.length);

            ByteBuffer in = ByteBuffer.wrap(combined);
            CharBuffer out = CharBuffer.allocate(combined.length);
            StringBuilder sb = new StringBuilder(combined.length);

            while (in.hasRemaining()) {
                CoderResult cr = decoder.decode(in, out, false);
                out.flip();
                sb.append(out);
                out.clear();
                if (cr.isUnderflow()) {
                    // 剩余字节为不完整多字节序列，留给下一块
                    break;
                }
                // overflow：out 已满，继续循环；error：REPLACE 已处理，继续
            }

            int remaining = in.remaining();
            if (remaining > 0) {
                carry = new byte[remaining];
                in.get(carry);
            } else {
                carry = new byte[0];
            }

            String result = sb.toString();
            return result.isEmpty() ? Flux.empty() : Flux.just(result);
        } finally {
            DataBufferUtils.release(dataBuffer);
        }
    }

    private Flux<String> flushTail() {
        if (carry.length == 0) {
            return Flux.empty();
        }
        ByteBuffer in = ByteBuffer.wrap(carry);
        CharBuffer out = CharBuffer.allocate(carry.length);
        decoder.decode(in, out, true);
        out.flip();
        carry = new byte[0];
        String result = out.toString();
        return result.isEmpty() ? Flux.empty() : Flux.just(result);
    }
}
