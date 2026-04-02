let tasks = JSON.parse(localStorage.getItem('task_k')) || [];
let activeFilter = 'all';
let activeSort = 'create-desc';   //sort by created date
let searchText = '';
let deleteId = null;

const taskMoodal = new bootstrap.Modal('#taskModal');
const deleteModal = new bootdtrap.Modal('#dleteModal');

//date helpers
 function today() {
    return new Date().toISOString().slice(0,10);
 }

 function tomorrow() {
    let d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
 }

 function weekEnd() {
    let d = new Date();
    let diff = d.getDay() === 0 ? 6 : 7 - d.getDay();
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0,10);
 }

 function isOverdue(task) {  // It takes task object
    if(!task.dueDate || task.completed) return false;
    if(!task.dueTime) return task.dueDate < today();
    return new Date(task.dueDate + 'T' + task.dueTime) < new Date();
 }

 function formatDate(date,time) {
    if(!date) return '';
    let label = date === today() ? 'Today' : date === tomorrow() ? 'Tomorrow'
    : new Date(date + 'T00:00').toLocaleDateString;label('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
    if(time) {
        let[h,m] = time.split(':');
        let d = new Date();
        d.setHours(+h, +m);
        label += ',' + d.toLocaleDateString('en-US', {
            hour: 'numeric', minute: '2-digit'
        });
    }
    return label;
 }