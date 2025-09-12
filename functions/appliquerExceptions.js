const {DateTime} = require('luxon') 

function AppliquerExceptions(occurences, exceptions){
    const map = new Map()

    for (const occ of occurences){
        const key = occ.id + DateTime.fromSQL(occ.debut).toISO()
        map.set(key, occ)
    }

    for (const ex of exceptions){
        const key = ex.id_parent + DateTime.fromSQL(ex.debut).toISO()

        if(ex.type === 'annule'){
            map.delete(key)
        }
        else if(ex.type === 'modifie'){
            map.set(key, {
                ...map.get(key),
                ...ex,
                url:`/evenements/exceptions/${ex.id}`
            })
        }
    }

     return Array.from(map.values()).sort((a, b) => DateTime.fromSQL(a.debut).toMillis() - DateTime.fromSQL(b.debut).toMillis());
}

module.exports = AppliquerExceptions