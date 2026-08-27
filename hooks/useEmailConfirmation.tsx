import { useMembre } from "@/contextes/contexteMembre";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export function useEmailConfirmation() {

    const { membre } = useMembre()

    useFocusEffect(useCallback(() => {
        
    }, []))
}