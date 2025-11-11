const {DateTime} = require('luxon') 

function AppliquerExceptions(occurences, exceptions){
    const map = new Map()
    //console.log('exceptions', exceptions)
    for (const occ of occurences){
        const key = occ.id + occ.debut
        //console.log('occ key', key)
        map.set(key, occ)
    }

    for (const ex of exceptions){
        const key = ex.id_parent + ex.debut
        //console.log('ex key', key)
        if(ex.type === 'annule'){
            map.delete(key)
        }
        else if(ex.type === 'modifie'){
            map.set(key, {
                ...map.get(key),
                ...ex,
                type:'exception',
                string:`/evenements/exceptions/${ex.id}`
            })
        }
    }

    const occurencesFiltrees = Array.from(map.values()).sort((a, b) => DateTime.fromSQL(a.debut).toMillis() - DateTime.fromSQL(b.debut).toMillis());

    //console.log('AppliquerExceptions occurencesFiltrees: ', occurencesFiltrees)

    return occurencesFiltrees
}

module.exports = AppliquerExceptions