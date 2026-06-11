package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.config.VerificationProperties;
import cn.novelstudio.module.auth.dto.SliderCaptchaChallengeResponse;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.platform.media.PythonImageClient;
import cn.novelstudio.platform.media.GeneratedImage;
import cn.novelstudio.platform.media.config.ImageClientProperties;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class SliderCaptchaService {

    private static final List<String> CAPTCHA_PROMPTS = List.of(
        "Soft abstract natural landscape, gentle colors, no text, no logos, photographic style, suitable as website background",
        "Calm ocean horizon at golden hour, subtle waves, no people, no text, high detail background texture",
        "Minimalist forest path with soft morning light, blurred depth, no text, no watermark, background photo",
        "Pastel city skyline at dusk, soft bokeh lights, no text, cinematic background suitable for puzzle captcha"
    );

    private final StringRedisTemplate redisTemplate;
    private final VerificationProperties properties;
    private final ImageClientProperties imageClientProperties;
    private final PythonImageClient pythonImageClient;
    private final SecureRandom random = new SecureRandom();

    public SliderCaptchaService(
        StringRedisTemplate redisTemplate,
        VerificationProperties properties,
        ImageClientProperties imageClientProperties,
        PythonImageClient pythonImageClient
    ) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.imageClientProperties = imageClientProperties;
        this.pythonImageClient = pythonImageClient;
    }

    public SliderCaptchaChallengeResponse createChallenge() {
        int width = properties.getSliderWidth();
        int height = properties.getSliderHeight();
        int puzzle = properties.getPuzzleSize();
        int minX = puzzle + 10;
        int maxX = width - puzzle - 10;
        int targetX = minX + random.nextInt(Math.max(1, maxX - minX));
        int targetY = 20 + random.nextInt(Math.max(1, height - puzzle - 30));

        BufferedImage source = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = source.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        if (!tryPaintAiBackground(g, width, height)) {
            paintBackground(g, width, height);
        }
        g.dispose();

        BufferedImage puzzleImage = new BufferedImage(puzzle, puzzle, BufferedImage.TYPE_INT_ARGB);
        Graphics2D pg = puzzleImage.createGraphics();
        pg.drawImage(source, 0, 0, puzzle, puzzle, targetX, targetY, targetX + puzzle, targetY + puzzle, null);
        pg.dispose();

        BufferedImage background = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D bg = background.createGraphics();
        bg.drawImage(source, 0, 0, null);
        bg.setColor(new Color(0, 0, 0, 120));
        bg.fillRect(targetX, targetY, puzzle, puzzle);
        bg.setStroke(new BasicStroke(2f));
        bg.setColor(new Color(255, 255, 255, 180));
        bg.drawRect(targetX, targetY, puzzle, puzzle);
        bg.dispose();

        String captchaId = UUID.randomUUID().toString().replace("-", "");
        storeChallenge(captchaId, targetX);

        return SliderCaptchaChallengeResponse.builder()
            .captchaId(captchaId)
            .backgroundImage(toBase64Png(background))
            .puzzleImage(toBase64Png(puzzleImage))
            .puzzleY(targetY)
            .sliderWidth(width)
            .build();
    }

    public String verifyAndIssueToken(String captchaId, int offsetX) {
        if (captchaId == null || captchaId.isBlank()) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "验证码无效");
        }
        String key = SecurityRedisKeys.CAPTCHA_CHALLENGE_PREFIX + captchaId;
        String raw = redisTemplate.opsForValue().get(key);
        if (raw == null) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "验证码已过期，请刷新");
        }
        redisTemplate.delete(key);
        int targetX = Integer.parseInt(raw.trim());
        if (Math.abs(offsetX - targetX) > properties.getCaptchaTolerancePx()) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "滑块验证失败，请重试");
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        redisTemplate.opsForValue().set(
            SecurityRedisKeys.CAPTCHA_TOKEN_PREFIX + token,
            "1",
            Duration.ofSeconds(properties.getCaptchaTokenTtlSeconds())
        );
        return token;
    }

    public void consumeCaptchaToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "请先完成滑块验证");
        }
        String key = SecurityRedisKeys.CAPTCHA_TOKEN_PREFIX + token;
        Boolean deleted = redisTemplate.delete(key);
        if (deleted == null || !deleted) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "滑块验证已失效，请重新验证");
        }
    }

    private boolean tryPaintAiBackground(Graphics2D g, int width, int height) {
        if (!imageClientProperties.isCaptchaEnabled() || !pythonImageClient.enabled()) {
            return false;
        }
        try {
            String prompt = CAPTCHA_PROMPTS.get(random.nextInt(CAPTCHA_PROMPTS.size()));
            GeneratedImage image = pythonImageClient.textToImage(
                prompt,
                imageClientProperties.getCaptchaSize(),
                true
            );
            BufferedImage ai = decodeImage(image);
            if (ai == null) {
                return false;
            }
            g.drawImage(ai, 0, 0, width, height, null);
            return true;
        } catch (Exception ex) {
            log.debug("滑块验证码 AI 背景失败，回退本地绘制: {}", ex.getMessage());
            return false;
        }
    }

    private BufferedImage decodeImage(GeneratedImage image) {
        try {
            if (image.hasBase64()) {
                byte[] bytes = Base64.getDecoder().decode(image.base64());
                return ImageIO.read(new ByteArrayInputStream(bytes));
            }
            if (image.hasUrl()) {
                java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
                java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(image.url()))
                    .GET()
                    .build();
                java.net.http.HttpResponse<byte[]> response = client.send(
                    request,
                    java.net.http.HttpResponse.BodyHandlers.ofByteArray()
                );
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    return ImageIO.read(new ByteArrayInputStream(response.body()));
                }
            }
        } catch (Exception ex) {
            log.debug("解码 AI 背景图失败: {}", ex.getMessage());
        }
        return null;
    }

    private void storeChallenge(String captchaId, int targetX) {
        redisTemplate.opsForValue().set(
            SecurityRedisKeys.CAPTCHA_CHALLENGE_PREFIX + captchaId,
            String.valueOf(targetX),
            Duration.ofSeconds(properties.getCaptchaChallengeTtlSeconds())
        );
    }

    private void paintBackground(Graphics2D g, int width, int height) {
        for (int y = 0; y < height; y++) {
            float ratio = (float) y / height;
            int r = (int) (40 + 80 * ratio);
            int gg = (int) (60 + 90 * (1 - ratio));
            int b = (int) (120 + 80 * ratio);
            g.setColor(new Color(r, gg, b));
            g.drawLine(0, y, width, y);
        }
        for (int i = 0; i < 18; i++) {
            g.setColor(new Color(random.nextInt(255), random.nextInt(255), random.nextInt(255), 80));
            int x1 = random.nextInt(width);
            int y1 = random.nextInt(height);
            int x2 = random.nextInt(width);
            int y2 = random.nextInt(height);
            g.drawLine(x1, y1, x2, y2);
        }
    }

    private String toBase64Png(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception ex) {
            throw new ValidationException(ResultCode.ERROR, "验证码图片生成失败");
        }
    }
}
