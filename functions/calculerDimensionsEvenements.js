const MS_HEURE = 3600000

const findDiffStartEnd = (start, end) =>{
    return end.startOf('day').diff(start.startOf('day'), 'days').toObject().days ?? 0
}

const findWidth = (debutLocal, finLocal, dateAffichee, heureOffset) => {
    const diffDebutFin = findDiffStartEnd(debutLocal, finLocal)
    
    if(diffDebutFin > 0 && debutLocal.day == dateAffichee.day){
        finLocal = debutLocal.plus({days:1}).set({hour:1, minute:0, second:0})
    }
    else if(diffDebutFin > 0 && finLocal.day == dateAffichee.day){
        debutLocal = finLocal.minus({days:1}).set({hour:23, minute:0, second:0})
    }
    else if(diffDebutFin > 0){
        return 26 * heureOffset
    }

    return ((finLocal?.toMillis() - debutLocal?.toMillis()) / MS_HEURE) * heureOffset;
};

const findLeft = (debutLocal, finLocal, dateAffichee, heureOffset) => {    
    const minuit = dateAffichee?.startOf('day'); // minuit du même jour
    const diffDebutFin = findDiffStartEnd(debutLocal, finLocal)

    //log('minuit local', minuit, 'debut local', debutLocal)
    if(minuit.day != debutLocal.day && diffDebutFin > 0){
        return -heureOffset
    }
    
    return ((debutLocal?.toMillis() - minuit?.toMillis()) / MS_HEURE) * heureOffset
    
};

export {findWidth, findLeft, findDiffStartEnd as TrouverDiffDebutFin }