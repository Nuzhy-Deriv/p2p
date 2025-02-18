import { api } from '@/hooks';
import { Analytics } from '@deriv-com/analytics';
import { useDevice } from '@deriv-com/ui';
import { act, renderHook } from '@testing-library/react';
import useDerivAnalytics from '../useDerivAnalytics';

jest.mock('@deriv-com/api-hooks', () => ({
    useAccountList: jest.fn(() => ({ data: [] })),
    useAuthData: jest.fn(() => ({ activeLoginid: 'test-loginid' })),
    useWebsiteStatus: jest.fn().mockReturnValue({ data: {} }),
}));

jest.mock('@/hooks', () => ({
    api: {
        account: {
            useActiveAccount: jest.fn(() => ({
                data: { account_type: 'test_account_type', currency: 'USD' },
            })),
            useBalance: jest.fn().mockReturnValue({ data: {} }),
        },
    },
}));

jest.mock('@deriv-com/ui', () => ({
    ...jest.requireActual('@deriv-com/ui'),
    useDevice: jest.fn().mockImplementation(() => ({
        isMobile: false,
    })),
}));

jest.mock('@deriv-com/analytics', () => ({
    Analytics: {
        getInstances: jest.fn().mockReturnValue({
            ab: {
                GrowthBook: {
                    init: jest.fn(),
                },
            },
            tracking: { has_initialized: false },
        }),
        initialise: jest.fn(),
    },
}));

jest.mock('js-cookie', () => ({
    get: jest.fn().mockReturnValue(
        JSON.stringify({
            utm_campaign: 'campaign',
            utm_content: 'content',
            utm_medium: 'medium',
            utm_source: 'source',
        })
    ),
}));

const mockedUseDevice = useDevice as jest.MockedFunction<typeof useDevice>;
const mockUseActiveAccount = api.account.useActiveAccount as jest.MockedFunction<typeof api.account.useActiveAccount>;

describe('useDerivAnalytics', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            value: { hostname: 'production' },
            writable: true,
        });
        process.env.VITE_GROWTHBOOK_DECRYPTION_KEY = 'test_decryption_key';
        process.env.VITE_GROWTHBOOK_CLIENT_KEY = 'test_client_key';
        process.env.VITE_RUDDERSTACK_KEY = 'test_rudderstack_key';
        process.env.VITE_REMOTE_CONFIG_URL = 'test_remote_config_url';
    });

    afterEach(async () => {
        jest.resetAllMocks();
        if (await global.fetch) {
            delete (global as unknown as { fetch: unknown }).fetch;
        }
    });

    it('should initialize analytics with correct config', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue({
                marketing_growthbook: true,
                tracking_rudderstack: true,
            }),
        } as unknown as Response);

        (mockUseActiveAccount as jest.Mock).mockReturnValueOnce({
            data: { account_type: 'test_account_type' },
        });

        (mockedUseDevice as jest.Mock).mockImplementation(() => ({
            isMobile: true,
        }));

        const { result } = renderHook(() => useDerivAnalytics());

        await act(async () => {
            await result.current.initialise();
        });

        const expectedConfig = {
            growthbookDecryptionKey: process.env.VITE_GROWTHBOOK_DECRYPTION_KEY,
            growthbookKey: process.env.VITE_GROWTHBOOK_CLIENT_KEY,
            growthbookOptions: {
                attributes: {
                    account_type: 'unlogged',
                    app_id: '36300',
                    country: '',
                    device_language: 'en-US',
                    device_type: 'mobile',
                    domain: 'production',
                    url: undefined,
                    user_language: 'en',
                    utm_campaign: 'campaign',
                    utm_content: 'content',
                    utm_medium: 'medium',
                    utm_source: 'source',
                },
                disableCache: true,
            },
            rudderstackKey: process.env.VITE_RUDDERSTACK_KEY || '',
        };

        expect(Analytics.initialise).toHaveBeenCalledWith(expectedConfig);
    });
});
