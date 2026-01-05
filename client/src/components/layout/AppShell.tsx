import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';

export const AppShell: React.FC = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Handle responsive behavior
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setSidebarCollapsed(true);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden text-foreground font-sans">
            {/* Sidebar */}
            <div className={cn(
                "flex-shrink-0 transition-all duration-300",
                sidebarCollapsed ? "w-16" : "w-64",
                isMobile && !sidebarCollapsed ? "absolute z-50 h-full shadow-xl" : ""
            )}>
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">

                {/* Mobile overlay */}
                {isMobile && !sidebarCollapsed && (
                    <div
                        className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
                        onClick={() => setSidebarCollapsed(true)}
                    />
                )}

                <main className="flex-1 overflow-hidden flex flex-col relative">
                    {/* Render the current route content */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
