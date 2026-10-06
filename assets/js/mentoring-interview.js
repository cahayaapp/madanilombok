import {dimensions as observationDimensions} from './mentoring-rubric.js';
// Indicator IDs and the 1–5 direction stay compatible with previous mentoring records.
const interview={
 sp1:['Kalau sudah mendekati waktu salat, biasanya kamu bersiap dan berangkat ke masjid bagaimana?',[
 'Saya biasanya baru berangkat setelah diingatkan lebih dari tiga kali.',
 'Saya berangkat setelah diingatkan satu atau dua kali.',
 'Saya biasanya langsung berangkat saat azan tanpa diingatkan.',
 'Saya sudah bersiap dengan pakaian rapi sebelum azan.',
 'Saya sudah di masjid sebelum azan dan mengajak teman untuk ikut bersiap.']],
 sp2:['Selama sepekan ini, bagaimana kamu mengikuti salat berjamaah?',[
 'Saya sering tertinggal lebih dari satu rakaat atau tidak ikut berjamaah.',
 'Saya kadang datang setelah takbir pertama imam.',
 'Saya biasanya mengikuti salat dari awal sampai salam.',
 'Saya selalu mengikuti takbir pertama bersama imam.',
 'Saya selalu datang tepat waktu dan juga mengerjakan salat sunah sebelum atau sesudahnya.']],
 sp3:['Saat halaqah atau ustaz menyampaikan materi, apa yang biasanya kamu lakukan?',[
 'Saya sering tertidur atau mengobrol sehingga banyak materi terlewat.',
 'Saya hadir, tetapi masih sering sulit memusatkan perhatian.',
 'Saya duduk tertib dan mendengarkan sampai selesai.',
 'Saya menyimak dan mencatat hal-hal penting.',
 'Saya menyimak, mencatat, dan bertanya atau menanggapi untuk memahami materi.']],
 re1:['Bagaimana kamu biasanya merespons ketika guru atau pengurus memanggil dan memberi arahan?',[
 'Saya kadang membantah atau menjawab dengan nada tinggi.',
 'Saya mengikuti arahannya, tetapi masih sering menggerutu atau menunda.',
 'Saya merespons dan mengikuti arahan dengan baik.',
 'Saya terbiasa menyapa lebih dulu dan berbicara dengan sopan.',
 'Saya berbicara dengan sopan dan menawarkan bantuan tanpa menunggu diminta.']],
 re2:['Bagaimana hubunganmu dengan teman-teman selama sepekan ini?',[
 'Saya beberapa kali terlibat ejekan atau pertengkaran.',
 'Saya masih kesulitan memulai atau menjaga hubungan yang nyaman dengan teman.',
 'Saya bisa berbicara dan berkegiatan bersama teman tanpa pertengkaran.',
 'Saya menjaga hubungan baik dan menyapa teman dari berbagai kelompok.',
 'Saya menjaga hubungan baik dan membantu teman menyelesaikan perselisihan dengan tenang.']],
 re3:['Bagaimana kamu menjalankan piket dan membantu teman atau menjaga ruang bersama?',[
 'Saya masih sering meninggalkan tugas piket.',
 'Saya mengerjakan piket kalau diawasi atau diingatkan langsung.',
 'Saya menyelesaikan bagian tugas piket saya.',
 'Saya menyelesaikan tugas dan berinisiatif membantu teman atau merapikan ruang bersama.',
 'Saya rutin menyelesaikan tugas dan sukarela membantu pekerjaan bersama yang belum selesai.']],
 em1:['Saat kecewa atau marah, apa yang biasanya kamu lakukan?',[
 'Saya masih sering berteriak atau membanting barang.',
 'Saya sulit menenangkan diri dan lama tidak mau ikut kegiatan.',
 'Saya membutuhkan waktu sendiri sebentar, lalu bisa kembali tenang.',
 'Saya bisa menceritakan rasa kecewa dengan tenang tanpa menyakiti orang lain.',
 'Saya bisa menenangkan diri, menceritakan perasaan, dan mencari jalan keluar.']],
 em2:['Kalau mendapat nasihat atau masukan, bagaimana biasanya kamu menanggapinya?',[
 'Saya biasanya langsung membantah atau menyalahkan orang lain.',
 'Saya mendengarkan, tetapi masih sulit menerima atau mencoba sarannya.',
 'Saya mendengarkan dengan tenang dan mengakui bagian yang perlu diperbaiki.',
 'Saya menerima masukan dan mencoba memperbaikinya setelah itu.',
 'Saya menerima masukan, memperbaiki diri, dan meminta umpan balik tentang perkembangannya.']],
 in1:['Bagaimana kamu mengikuti pelajaran dan mengerjakan tugas selama sepekan ini?',[
 'Saya sering terlambat, melewatkan pelajaran, atau tertidur saat belajar.',
 'Saya hadir, tetapi sering belum siap dengan buku atau alat belajar.',
 'Saya mengikuti pelajaran dan menyelesaikan tugas yang diberikan.',
 'Saya mengikuti pelajaran dengan aktif, mencatat, dan ikut berdiskusi.',
 'Saya aktif belajar, mencari bacaan tambahan, dan membantu teman memahami materi.']],
 in2:['Saat mendapat materi atau tugas yang baru, bagaimana kamu biasanya memahaminya?',[
 'Saya masih kesulitan memahami sebagian besar materi meskipun sudah mencoba.',
 'Saya biasanya perlu penjelasan dan latihan berulang dengan pendampingan.',
 'Saya bisa memahami penjelasan dasar dan mengikuti petunjuk tugas.',
 'Saya bisa memahami materi dan menjelaskannya kembali dengan cukup lancar.',
 'Saya bisa menjelaskan alasan, menghubungkan materi, dan mencoba memecahkan soal yang berbeda.']],
 fi1:['Bagaimana kamu menjaga kebersihan diri, pakaian, dan tempat barangmu?',[
 'Saya masih sering melewatkan mandi atau membiarkan pakaian dan barang kotor.',
 'Saya sudah mencoba, tetapi kebersihan dan kerapian saya belum teratur.',
 'Saya mandi teratur, memakai pakaian bersih, dan merapikan barang saya.',
 'Saya rutin menjaga diri, pakaian, tempat tidur, dan tempat barang tetap bersih dan rapi.',
 'Saya rutin menjaga kebersihan sendiri dan mengajak teman menjaga kebersihan bersama.']],
 fi2:['Bagaimana kebiasaan tidur dan energimu untuk mengikuti kegiatan sehari-hari?',[
 'Saya sering tidur sangat larut sehingga kesulitan mengikuti kegiatan esok hari.',
 'Jam tidur saya belum teratur dan saya sering mengantuk saat kegiatan.',
 'Saya cukup beristirahat dan umumnya bisa mengikuti kegiatan harian.',
 'Saya mengikuti jam tidur dan biasanya bangun dengan tubuh terasa segar.',
 'Saya menjaga tidur teratur, merasa cukup bugar, dan rutin berolahraga sesuai kemampuan.']]
};
export const dimensions=observationDimensions.map(d=>({...d,indicators:d.indicators.map(i=>({...i,label:interview[i.id][0],options:interview[i.id][1]}))}));
export function dimensionScores(answers={}){
 return dimensions.map(d=>{const values=d.indicators.map(i=>answers[i.id]).filter(v=>Number.isInteger(v)&&v>=1&&v<=5),sum=values.reduce((a,b)=>a+b,0);return {id:d.id,name:d.name,answered:values.length,total:d.indicators.length,sum,score:values.length?Math.round(sum/values.length*100)/100:null,complete:values.length===d.indicators.length};});
}
