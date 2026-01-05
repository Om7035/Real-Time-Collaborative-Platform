import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
    LayoutDashboard,
    Plus,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import axios from '../../auth/axiosInstance';
import config from '../../utils/config';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = React.useState(false);

    const handleCreateNew = async () => {
        setIsCreating(true);
        try {
            const response = await axios.post(
                config.endpoints.documents.create,
                { title: 'Untitled Document' }
            );
            if (response.data.success) {
                navigate(`/workspace/${response.data.data.id}`);
            }
        } catch (error) {
            console.error('Failed to create document:', error);
        } finally {
            setIsCreating(false);
        }
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
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* User Profile */}
            <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3 p-2 rounded-md">
                    <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                        {getInitials(user?.email || 'U')}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-foreground">
                                {user?.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-2">
                {/* New Document Button */}
                <button
                    onClick={handleCreateNew}
                    disabled={isCreating}
                    className={cn(
                        "w-full flex items-center gap-2 p-2.5 rounded-md text-sm font-medium transition-colors",
                        collapsed ? "justify-center" : "px-3",
                        isCreating
                            ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    title="Create new document"
                >
                    {isCreating ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                            {!collapsed && <span>Creating...</span>}
                        </>
                    ) : (
                        <>
                            <Plus size={18} />
                            {!collapsed && <span>New Document</span>}
                        </>
                    )}
                </button>

                {/* Dashboard Link */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className={cn(
                        "w-full flex items-center gap-2 p-2.5 rounded-md text-sm transition-colors",
                        collapsed ? "justify-center" : "px-3",
                        window.location.pathname === '/dashboard'
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                    title="My Documents"
                >
                    <LayoutDashboard size={18} />
                    {!collapsed && <span>My Documents</span>}
                </button>
            </div>

            {/* Footer - Logout */}
            <div className="p-2 border-t border-border/50">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-2 p-2.5 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
                        collapsed ? "justify-center" : "px-3"
                    )}
                    title="Log out"
                >
                    <LogOut size={18} />
                    {!collapsed && <span>Log out</span>}
                </button>
            </div>
        </aside>
    );
};
