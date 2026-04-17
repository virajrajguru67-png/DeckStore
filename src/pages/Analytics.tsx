import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Eye, Clock, UserCheck, TrendingUp, Filter } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_PAGE_DATA = [
    { page: 1, views: 150, stayTime: 45 },
    { page: 2, views: 142, stayTime: 60 },
    { page: 3, views: 110, stayTime: 90 },
    { page: 4, views: 95, stayTime: 120 },
    { page: 5, views: 45, stayTime: 20 }, // Drop off here
    { page: 6, views: 30, stayTime: 15 },
];

const MOCK_TREND_DATA = [
    { date: '2025-12-21', views: 45 },
    { date: '2025-12-22', views: 52 },
    { date: '2025-12-23', views: 89 },
    { date: '2025-12-24', views: 65 },
    { date: '2025-12-25', views: 98 },
    { date: '2025-12-26', views: 120 },
    { date: '2025-12-27', views: 145 },
];

export default function Analytics() {
    const [stats, setStats] = useState({
        totalViews: 0,
        avgStayTime: 0,
        activeShares: 0,
    });

    useEffect(() => {
        // In a real app, you would fetch this from your database
        // For now, let's pretend we're fetching it
        setStats({
            totalViews: 1245,
            avgStayTime: 185, // seconds
            activeShares: 24,
        });
    }, []);

    return (
        <DashboardLayout title="Analytics" subtitle="Deep insights into how your decks are being viewed">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                            <Eye className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalViews}</div>
                            <p className="text-xs text-muted-foreground mt-1">+12% from last week</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-500/5 border-blue-500/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Avg. View Duration</CardTitle>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{Math.floor(stats.avgStayTime / 60)}m {stats.avgStayTime % 60}s</div>
                            <p className="text-xs text-muted-foreground mt-1">Increasing engagement</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-purple-500/5 border-purple-500/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Active Shares</CardTitle>
                            <UserCheck className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.activeShares}</div>
                            <p className="text-xs text-muted-foreground mt-1">Across 8 documents</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Viewer Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Viewer Traffic Trend
                            </CardTitle>
                            <CardDescription>Daily unique viewers across all shared decks</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={MOCK_TREND_DATA}>
                                        <defs>
                                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.3)" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                            tickFormatter={(value) => format(new Date(value), 'MMM d')}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                            itemStyle={{ color: 'hsl(var(--primary))' }}
                                        />
                                        <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Page Drop-off */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Page Retention & Drop-off</CardTitle>
                            <CardDescription>Which pages lose the most viewers?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={MOCK_PAGE_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.3)" />
                                        <XAxis
                                            dataKey="page"
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: 'Page Number', position: 'bottom', offset: 0 }}
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                        />
                                        <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                                            {MOCK_PAGE_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.views < 50 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Chart Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Avg Stay Time per Page */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Engagement Intensity</CardTitle>
                            <CardDescription>Average seconds spent per page</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={MOCK_PAGE_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.3)" />
                                        <XAxis dataKey="page" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                        />
                                        <Line type="monotone" dataKey="stayTime" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Share Breakdown */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg">Access Breakdown</CardTitle>
                            <CardDescription>How are users accessing your content?</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center">
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Internal Share', value: 40 },
                                                { name: 'Public Link', value: 55 },
                                                { name: 'QR Code', value: 5 },
                                            ]}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="hsl(var(--primary))" />
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#8b5cf6" />
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                    <span className="text-xs text-muted-foreground lowercase">Internal Share (40%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-xs text-muted-foreground lowercase">Public Link (55%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                                    <span className="text-xs text-muted-foreground lowercase">QR Code (5%)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </DashboardLayout>
    );
}
