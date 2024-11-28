import { useEffect, useState } from 'react';
import { useScript } from 'usehooks-ts';

const useIntercom = (token: string | null, flag: boolean) => {
    const intercomScript = 'https://static.deriv.com/scripts/intercom/v1.0.1.js';
    const scriptStatus = useScript(flag ? intercomScript : null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!flag || scriptStatus !== 'ready' || !window?.DerivInterCom) return;

        let intervalId: NodeJS.Timeout;

        const initIntercom = () => {
            window.DerivInterCom.initialize({
                hideLauncher: true,
                token,
            });

            intervalId = setInterval(() => {
                if (window?.Intercom && !isReady) {
                    setIsReady(true);
                    clearInterval(intervalId);
                }
            }, 500);
        };

        initIntercom();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [flag, isReady, scriptStatus, token]);

    return { isReady };
};

export default useIntercom;