import {EmailAuthProvider,reauthenticateWithCredential,updatePassword} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {auth} from './firebase.js';
export async function changeOwnPassword(currentPassword,newPassword,expectedUid){
 const user=auth.currentUser;if(!user||user.uid!==expectedUid||!user.email)throw Error('Sesi akun telah berubah. Silakan masuk kembali.');
 await reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,currentPassword));
 if(auth.currentUser?.uid!==expectedUid)throw Error('Sesi akun telah berubah. Silakan masuk kembali.');
 await updatePassword(user,newPassword);
}
