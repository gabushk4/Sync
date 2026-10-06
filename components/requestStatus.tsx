import { usePalette } from "@/contextes/contextePalette";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import Spinner from "@/components/spinner";
import { requestListener } from "@/events/requestEvents";

/**
 * Subscribes to the global request state (events/requestEvents.ts).
 *
 * @returns {boolean} Whether at least one non-silent API request is in flight.
 */
function useFetchIndicator(): boolean {
    return useSyncExternalStore(
        (callback) => requestListener.subscribe(() => callback()),
        () => requestListener.isFetching
    )
}

/**
 * Header indicator shown while the app waits on the API (used in the home and
 * feed headers).
 * User story 12: it used to be a green dot only visible in development; it is
 * now a spinner shown to every member. Background polling (AutoRefresh) is sent
 * as `silencieux` and doesn't trigger it.
 *
 * @returns {JSX.Element} A 24x24 box, empty when nothing is loading so the header doesn't shift.
 */
export default function RequestStatus() {
    const { colors } = usePalette()
    const { t } = useTranslation()
    const enCours = useFetchIndicator()

    return (
        <View style={{width:24, height:24, justifyContent:'center', alignItems:'center'}}>
            {enCours && <Spinner size={20} color={colors.muted} accessibilityLabel={t('common:loading')} />}
        </View>
    )
}
