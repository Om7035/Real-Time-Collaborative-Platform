import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
    LayoutDashboard,
    FileText,
    Plus,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Search
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleCreateNew = () => {
        // TODO: Implement create logic directly or navigate
        navigate('/dashboard');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside
            className={cn(
                "h-screen bg-secondary/30 border-r border-border flex flex-col transition-all duration-300 ease-in-out relative group",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-6 bg-background border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* User Profile / Workspace Switcher */}
            <div className="p-4 border-b border-border/50">
                <div
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                >
                    <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                        {getInitials(user?.email || 'U')}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-foreground">{user?.email?.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">

                {/* Quick Actions */}
                <button
                    onClick={handleCreateNew}
                    className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm text-foreground hover:bg-accent/50 transition-colors mb-4",
                        collapsed ? "justify-center" : "px-3"
                    )}
                >
                    <Plus size={18} className="text-muted-foreground" />
                    {!collapsed && <span>New Page</span>}
                </button>

                <div className="mb-6">
                    {!collapsed && <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Workspace</h3>}
                    <NavItem
                        to="/dashboard"
                        icon={<LayoutDashboard size={18} />}
                        label="Dashboard"
                        collapsed={collapsed}
                    />
                    <NavItem
                        to="#"
                        icon={<Search size={18} />}
                        label="Search"
                        collapsed={collapsed}
                    />
                    <NavItem
                        to="#"
                        icon={<Settings size={18} />}
                        label="Settings"
                        collapsed={collapsed}
                    />
                </div>

                {/* Documents List (Placeholder) */}
                {!collapsed && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between px-3 mb-2 group/header">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Private</h3>
                            <Plus size={14} className="text-muted-foreground opacity-0 group-hover/header:opacity-100 cursor-pointer hover:text-foreground" />
                        </div>
                        <div className="space-y-0.5">
                            {/* Placeholder items */}
                            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 rounded-md cursor-pointer">
                                <FileText size={14} />
                                <span className="truncate">Product Roadmap</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 rounded-md cursor-pointer">
                                <FileText size={14} />
                                <span className="truncate">Meeting Notes</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Context Menu */}
            <div className="p-2 border-t border-border/50">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
                        collapsed ? "justify-center" : "px-3"
                    )}
                >
                    <LogOut size={18} />
                    {!collapsed && <span>Log out</span>}
                </button>
            </div>
        </aside>
    );
};

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
    collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, collapsed }) => (
    <NavLink
        to={to}
        className={({ isActive }) => cn(
            "flex items-center gap-2 p-2 rounded-md text-sm transition-all duration-200",
            collapsed ? "justify-center" : "px-3",
            isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
    >
        {icon}
        {!collapsed && <span>{label}</span>}
    </NavLink>
);
