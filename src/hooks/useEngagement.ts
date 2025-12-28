import { useState, useEffect, useRef } from 'react';
import { shareService } from '@/services/shareService';

export function useEngagement(shareId: string | undefined, resourceType: string) {
    const [logId, setLogId] = useState<string | null>(null);
    const startTime = useRef<number>(Date.now());
    const pageViews = useRef<{ page: number; duration: number; entryTime: number }[]>([]);
    const currentPage = useRef<number>(1);
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        if (!shareId) return;

        const initLog = async () => {
            const id = await shareService.logEngagement(shareId, 'view', { resourceType });
            setLogId(id);
        };

        initLog();

        // Heartbeat to update duration every 10 seconds
        intervalRef.current = setInterval(() => {
            if (logId) {
                const duration = Math.floor((Date.now() - startTime.current) / 1000);
                shareService.updateEngagement(logId, duration, pageViews.current);
            }
        }, 10000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (logId) {
                const duration = Math.floor((Date.now() - startTime.current) / 1000);
                shareService.updateEngagement(logId, duration, pageViews.current);
            }
        };
    }, [shareId, logId]);

    const trackPageChange = (pageNum: number) => {
        const now = Date.now();

        // Update previous page duration
        if (pageViews.current.length > 0) {
            const lastView = pageViews.current[pageViews.current.length - 1];
            lastView.duration = Math.floor((now - lastView.entryTime) / 1000);
        }

        pageViews.current.push({
            page: pageNum,
            duration: 0,
            entryTime: now
        });

        currentPage.current = pageNum;
    };

    return { trackPageChange };
}
