import axios from 'axios';
import config from '../utils/config';
import { Invite, UserRole } from '../types/document'; // We need to sync types

export interface CreateInviteRequest {
    role: UserRole;
    expiresIn: number | null; // seconds
    maxUses: number | null;
}

export interface InviteInfo {
    inviterId: string;
    documentTitle: string;
    role: UserRole;
    valid: boolean;
}

const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
        Authorization: token ? `Bearer ${token}` : '',
    };
};

export const inviteAPI = {
    create: async (documentId: string, request: CreateInviteRequest): Promise<Invite> => {
        try {
            const response = await axios.post(
                config.endpoints.invites.create(documentId),
                request,
                { headers: getHeaders() }
            );
            return response.data.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to create invite');
        }
    },

    list: async (documentId: string): Promise<Invite[]> => {
        try {
            const response = await axios.get(
                config.endpoints.invites.list(documentId),
                { headers: getHeaders() }
            );
            return response.data.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to list invites');
        }
    },

    get: async (token: string): Promise<InviteInfo> => {
        try {
            const response = await axios.get(config.endpoints.invites.get(token));
            return response.data.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to get invite info');
        }
    },

    accept: async (token: string): Promise<{ documentId: string; role: string }> => {
        try {
            const response = await axios.post(
                config.endpoints.invites.accept(token),
                {},
                { headers: getHeaders() }
            );
            return response.data.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to accept invite');
        }
    },

    revoke: async (token: string): Promise<void> => {
        try {
            await axios.delete(
                config.endpoints.invites.revoke(token),
                { headers: getHeaders() }
            );
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to revoke invite');
        }
    }
};
