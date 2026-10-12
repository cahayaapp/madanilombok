export function validateDuty(row,staff,scope){
 if(scope.school||staff?.gender!==scope.gender||row.gender!==scope.gender)throw Error('Personil di luar unit asrama Anda.');
 if(!['shift1','shift2','shift3'].includes(row.shiftId)||![0,480,960].includes(row.startMinute)||row.endMinute!==row.startMinute+480||row.startMinute!==(['shift1','shift2','shift3'].indexOf(row.shiftId)*480))throw Error('Gunakan shift 00–08, 08–16, atau 16–24 WITA.');
 return row;
}
