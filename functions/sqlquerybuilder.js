/* function selectQueryBuilder(args, tables, conditions, addons){
    
    var sqlString = 'SELECT '

    for(let i = 0; i < args.length; i++){
        if(i + 1 == args.length)
            sqlString += args[i]
        else
            sqlString += args[i] + ',' 
    }

    sqlString += ` FROM `

    if(Array.isArray(tables[0]))
        for(let i = 0; i < tables.length; ++i){
            let statment = tables[i] 
            let aliassA = statment[0].substr(0, 3)
            let aliassB = statment[2].substr(0, 3)
            sqlString += `${statment[0]} ${aliassA} ${statment[1]} JOIN ${statment[2]} ${aliassB} ON ${aliassA}.${statment[3]} = ${aliassB}.${statment[3]}`
        }
    else
        sqlString += tables[0]

    if(conditions.length > 0){
        sqlString += ` WHERE (${conditions[0]} = ?)`
        for(let i = 1; i < conditions.length; ++i){
            sqlString += ` AND (${conditions[i]} = ?)`
        }
    }
    
    if(addons.length > 0)
        for(let i = 0; i < addons.length; ++i)
            sqlString += ` ${addons[i]} `
    
    return sqlString
}


module.exports = selectQueryBuilder() */