export default function formaterDatePourServeur(dateDt) {
    if(dateDt){
        //log(dateDt)
        const dateF = dateDt.toFormat("yyyy-MM-dd HH:mm:ss");
        //console.log('date formatée pour serveur', dateF);
        return dateF;
    }else
        return null
}