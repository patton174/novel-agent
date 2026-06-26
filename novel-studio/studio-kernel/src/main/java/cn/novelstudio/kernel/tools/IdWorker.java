package cn.novelstudio.kernel.tools;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Snowflake 分布式 ID（移植自 roncoo-education IdWorker，无 Spring 依赖）。
 */
public final class IdWorker {

    private static final Sequence WORKER = new Sequence();

    private IdWorker() {}

    public static long getId() {
        return WORKER.nextId();
    }

    /** 字符串形态 Snowflake ID，用于 varchar 主键（比 UUID 索引更友好）。 */
    public static String nextIdStr() {
        return Long.toString(getId());
    }

    public static String prefixed(String prefix) {
        return prefix + getId();
    }

    public static String get32Uuid() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    static final class Sequence {

        private final long twepoch = 1288834974657L;
        private final long workerIdBits = 5L;
        private final long datacenterIdBits = 5L;
        private final long maxWorkerId = -1L ^ (-1L << workerIdBits);
        private final long maxDatacenterId = -1L ^ (-1L << datacenterIdBits);
        private final long sequenceBits = 12L;
        private final long workerIdShift = sequenceBits;
        private final long datacenterIdShift = sequenceBits + workerIdBits;
        private final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;
        private final long sequenceMask = -1L ^ (-1L << sequenceBits);

        private final long workerId;
        private final long datacenterId;
        private long sequence = 0L;
        private long lastTimestamp = -1L;

        Sequence() {
            this.datacenterId = getDatacenterId(maxDatacenterId);
            this.workerId = getMaxWorkerId(datacenterId, maxWorkerId);
        }

        Sequence(long workerId, long datacenterId) {
            if (workerId > maxWorkerId || workerId < 0) {
                throw new IllegalArgumentException("framework.id_worker.worker_id_out_of_range");
            }
            if (datacenterId > maxDatacenterId || datacenterId < 0) {
                throw new IllegalArgumentException("framework.id_worker.datacenter_id_out_of_range");
            }
            this.workerId = workerId;
            this.datacenterId = datacenterId;
        }

        static long getMaxWorkerId(long datacenterId, long maxWorkerId) {
            StringBuilder mpid = new StringBuilder().append(datacenterId);
            String name = ManagementFactory.getRuntimeMXBean().getName();
            if (name != null && !name.isEmpty()) {
                mpid.append(name.split("@")[0]);
            }
            return (mpid.toString().hashCode() & 0xffff) % (maxWorkerId + 1);
        }

        static long getDatacenterId(long maxDatacenterId) {
            long id = 0L;
            try {
                InetAddress ip = InetAddress.getLocalHost();
                NetworkInterface network = NetworkInterface.getByInetAddress(ip);
                if (network == null) {
                    id = 1L;
                } else {
                    byte[] mac = network.getHardwareAddress();
                    if (mac != null) {
                        id = ((0x000000FF & (long) mac[mac.length - 1])
                            | (0x0000FF00 & (((long) mac[mac.length - 2]) << 8))) >> 6;
                        id = id % (maxDatacenterId + 1);
                    }
                }
            } catch (Exception ignored) {
                id = 1L;
            }
            return id;
        }

        synchronized long nextId() {
            long timestamp = timeGen();
            if (timestamp < lastTimestamp) {
                long offset = lastTimestamp - timestamp;
                if (offset <= 5) {
                    try {
                        wait(offset << 1);
                        timestamp = timeGen();
                        if (timestamp < lastTimestamp) {
                            throw new IllegalStateException("framework.id_worker.clock_backwards");
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(e);
                    }
                } else {
                    throw new IllegalStateException("framework.id_worker.clock_backwards");
                }
            }

            if (lastTimestamp == timestamp) {
                sequence = (sequence + 1) & sequenceMask;
                if (sequence == 0) {
                    timestamp = tilNextMillis(lastTimestamp);
                }
            } else {
                sequence = ThreadLocalRandom.current().nextLong(1, 3);
            }

            lastTimestamp = timestamp;
            return ((timestamp - twepoch) << timestampLeftShift)
                | (datacenterId << datacenterIdShift)
                | (workerId << workerIdShift)
                | sequence;
        }

        long tilNextMillis(long lastTimestamp) {
            long timestamp = timeGen();
            while (timestamp <= lastTimestamp) {
                timestamp = timeGen();
            }
            return timestamp;
        }

        long timeGen() {
            return SystemClock.now();
        }
    }

    static final class SystemClock {

        private final AtomicLong now;

        private SystemClock(long period) {
            this.now = new AtomicLong(System.currentTimeMillis());
            ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
                Thread thread = new Thread(runnable, "IdWorker-Clock");
                thread.setDaemon(true);
                return thread;
            });
            scheduler.scheduleAtFixedRate(() -> now.set(System.currentTimeMillis()), period, period, TimeUnit.MILLISECONDS);
        }

        static long now() {
            return Holder.INSTANCE.now.get();
        }

        private static final class Holder {
            static final SystemClock INSTANCE = new SystemClock(1);
        }
    }
}
