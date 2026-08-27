import {DateTime} from 'luxon'

export default function ceilBy5(d: DateTime): DateTime {
        const minsCeilled = Math.ceil(d.minute / 5) * 5
        if (minsCeilled === 60) {
            return d.plus({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 })
        }
        return d.set({ minute: minsCeilled, second: 0, millisecond: 0 })
    }