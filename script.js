let tasks = JSON.parse(localStorage.getItem(task)) || [];
let activeFilter = "all";
let activeSort = "create-desc";
let searchText = "";
let deleteId = null;

const taskModal = new bootstrap.Modal('#taskModal');
const deleteModal = new bootstrap.Modal('#deleteModal');

//Date Helpers

class DateHelper {
    static getDate(offset = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toDateString().slice(0,10);
    }

    static weekEnd() {
        const d = new Date();
        const diff = d.getDay() == 0 ? 6 : 7-d.getDay();
        d.setDate(d.getDate() + diff);
        return d.toISOString().slice(0,10);
    }

    static format(date,time) {
        if(!date) return "";
        let label;
        if(date === DateHelper.getDate()) {
            label = "Today";
        }else if(date === DateHelper.getDate(1)) {
            label = "Tomorrow"
        }else {
            label = new Date(date + "T00:00").toLocaleDateString("en-US", {
                month: "short", day: "number", year: "numeric",
            });
        }
        if(time){
            const[h,m] = time.split(":");
            const d = new Date();
            d.setHours(+h, +m);
            label += "," + d.toLocaleDateString("en-US", {
                hour: "numeric", minute: "2-digit"
            });
        }
        return label;
    }
}