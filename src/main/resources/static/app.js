/* ==========================================================================
   DOCUMENT REVIEWER — APPLICATION SCRIPT  (database-backed)

   The record list now lives in MySQL, reached through the Spring Boot API.
   The browser holds only a temporary copy for display, search and paging.

   1. Config            5. Table          9.  Add / Edit modal
   2. State             6. Helpers        10. Delete
   3. Server calls      7. Pagination
   4. Login             8. Search
   ========================================================================== */


/* 1. CONFIG */

var API = "/api/cases";   // same origin, because Spring serves this page too
var PAGE_SIZE = 5;


/* 2. STATE */

var rows = [];             // master list, filled from the server
var view = [];             // the records that match the current search
var page = 1;              // page number being shown
var mode = "edit";         // modal is either "edit" or "add"
var editCaseId = null;     // caseId of the record being edited
var busy = false;          // true while a request is in flight


/* 3. SERVER CALLS
   Every function here is async: it sends a request, then waits for the
   reply before carrying on. That is the one real difference from before. */

// GET /api/cases  → refill rows[] with whatever the database holds now
async function loadRecords() {

  var response = await fetch(API);

  if (!response.ok) {
    throw new Error("Could not load records (status " + response.status + ")");
  }
  rows = await response.json();
}

// POST /api/cases  → create one record
async function createRecord(record) {

  var response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    // the server sends a plain-text reason, e.g. "Case ID 1001 already exists."
    throw new Error(await response.text());
  }
}

// PUT /api/cases/1003  → overwrite one record
async function updateRecord(caseId, record) {

  var response = await fetch(API + "/" + encodeURIComponent(caseId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

// DELETE /api/cases/1003  → remove one record
async function deleteRecord(caseId) {

  var response = await fetch(API + "/" + encodeURIComponent(caseId), {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}


/* 4. LOGIN */

async function login() {

  var now = new Date();

  var time =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  var date =
    String(now.getDate()).padStart(2, "0") + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    now.getFullYear();

  document.getElementById("loginInfo").textContent =
    "Logged in: " + time + " | " + date;

  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";

  // fetch the records before showing anything in the table
  showLoading();

  try {
    await loadRecords();
    applyFilter("first");
  } catch (error) {
    showBanner("Could not reach the server. Is the application running?");
    showTableMessage("Records unavailable.");
  }
}

function logout() {

  document.getElementById("loginInfo").textContent = "";

  document.getElementById("app").style.display = "none";
  document.getElementById("login").style.display = "flex";

  document.getElementById("pass").value = "";
  document.getElementById("user").focus();

  rows = [];
  view = [];
  page = 1;
  hideBanner();
}

// Pull the list again and redraw, keeping the user roughly where they were.
async function refresh(jump) {

  try {
    await loadRecords();
    applyFilter(jump);
    hideBanner();
  } catch (error) {
    showBanner("Lost contact with the server. The list may be out of date.");
  }
}


/* 5. TABLE */

function render() {

  // never leave the user on a page that no longer exists
  if (page > pageCount()) {
    page = pageCount();
  }

  var start = (page - 1) * PAGE_SIZE;
  var stop = start + PAGE_SIZE;
  var html = "";

  // record counter next to the heading
  if (view.length === 1) {
    document.getElementById("count").textContent = "1 record";
  } else {
    document.getElementById("count").textContent = view.length + " records";
  }

  // nothing matched the search
  if (view.length === 0) {
    if (rows.length === 0) {
      showTableMessage("No records yet. Use \u201c+ Add record\u201d to create one.");
    } else {
      showTableMessage("No records match this search. Clear the search to see all records.");
    }
    renderPager();
    return;
  }

  // build one <tr> for every record on this page
  for (var i = start; i < stop && i < view.length; i++) {

    var record = view[i];
    var id = esc(record.caseId);

    html += "<tr>";
    html += "<td><strong>" + id + "</strong></td>";
    html += "<td>" + esc(record.name) + "</td>";
    html += "<td>" + esc(record.docType) + "</td>";
    html += "<td>" + esc(record.date) + "</td>";
    html += "<td><span class=\"tag " + record.status + "\">" + esc(record.status) + "</span></td>";
    html += "<td>" + esc(record.remarks) + "</td>";
    html += "<td><button class=\"edit\" onclick=\"editRow('" + id + "')\">Edit</button></td>";
    html += "<td><button class=\"delete\" onclick=\"deleteRow('" + id + "')\">Delete</button></td>";
    html += "</tr>";
  }

  document.getElementById("tbody").innerHTML = html;
  renderPager();
}

function showTableMessage(text) {
  document.getElementById("tbody").innerHTML =
    "<tr><td colspan=\"8\" class=\"empty\">" + esc(text) + "</td></tr>";
}

function showLoading() {
  showTableMessage("Loading records\u2026");
  document.getElementById("count").textContent = "\u2026";
  document.getElementById("range").textContent = "";
  document.getElementById("pageNums").innerHTML = "";
}

// red strip under the nav bar, used when the server cannot be reached
function showBanner(message) {
  var banner = document.getElementById("banner");
  banner.textContent = message;
  banner.classList.add("show");
}

function hideBanner() {
  document.getElementById("banner").classList.remove("show");
}


/* 6. HELPERS */

// Turn characters that mean something in HTML into harmless text,
// so a remark like "<b>" shows as text instead of changing the page.
function esc(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Find a record in the master list by its case ID.
function findRecord(caseId) {
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].caseId === caseId) {
      return rows[i];
    }
  }
  return null;
}

// How many pages does the current result set need?
function pageCount() {
  var total = Math.ceil(view.length / PAGE_SIZE);
  if (total < 1) {
    total = 1;
  }
  return total;
}

// Today as "2026-07-22", the format an <input type="date"> expects.
function todayDate() {
  var d = new Date();
  var month = d.getMonth() + 1;
  var day = d.getDate();

  if (month < 10) { month = "0" + month; }
  if (day < 10)   { day = "0" + day; }

  return d.getFullYear() + "-" + month + "-" + day;
}

// Highest existing case ID plus one, e.g. 1008 -> "1009".
// Only a suggestion: the server has the final say on duplicates.
function nextCaseId() {
  var highest = 1000;

  for (var i = 0; i < rows.length; i++) {
    var number = parseInt(rows[i].caseId, 10);
    if (!isNaN(number) && number > highest) {
      highest = number;
    }
  }
  return String(highest + 1);
}

// Stop double submissions while a request is still travelling.
function setBusy(value) {
  busy = value;
  document.getElementById("saveBtn").disabled = value;
}


/* 7. PAGINATION */

function renderPager() {

  var total = pageCount();
  var first = 0;
  var last = 0;
  var html = "";

  // "Showing 1-5 of 8"
  if (view.length > 0) {
    first = (page - 1) * PAGE_SIZE + 1;
    last = page * PAGE_SIZE;

    if (last > view.length) {
      last = view.length;
    }
    document.getElementById("range").textContent =
      "Showing " + first + "-" + last + " of " + view.length;
  } else {
    document.getElementById("range").textContent = "Nothing to show";
  }

  // one numbered button per page
  for (var n = 1; n <= total; n++) {
    var css = "page-btn";

    if (n === page) {
      css = "page-btn active";
    }
    html += "<button class=\"" + css + "\" onclick=\"goToPage(" + n + ")\">" + n + "</button>";
  }

  document.getElementById("pageNums").innerHTML = html;

  // grey out the arrows at the two ends
  document.getElementById("prevBtn").disabled = (page === 1);
  document.getElementById("nextBtn").disabled = (page === total);
}

function goToPage(number) {
  page = number;
  render();
}

function prevPage() {
  if (page > 1) {
    page = page - 1;
    render();
  }
}

function nextPage() {
  if (page < pageCount()) {
    page = page + 1;
    render();
  }
}


/* 8. SEARCH
   Still done in the browser, on the copy fetched from the server. */

/**
 * Rebuild view[] from the search box and the field dropdown.
 * jump = "first" go to page 1 | "keep" stay | "last" go to the last page
 */
function applyFilter(jump) {

  var text = document.getElementById("searchText").value.trim().toLowerCase();
  var field = document.getElementById("searchField").value;
  var type = document.getElementById("typeFilter").value;
  var status = document.getElementById("statusFilter").value;

  view = [];

  for (var i = 0; i < rows.length; i++) {

    var record = rows[i];
    var haystack = "";
    var matchesText = true;
    var matchesType = (type === "all" || record.docType === type);
    var matchesStatus = (status === "all" || record.status === status);

    // empty search box means everything matches
    if (text !== "") {
      if (field === "all") {
        haystack = record.caseId + " " + record.name + " " + record.docType + " " +
                   record.date + " " + record.status + " " + record.remarks;
      } else {
        haystack = record[field];
      }

      matchesText = String(haystack).toLowerCase().indexOf(text) !== -1;
    }

    if (matchesText && matchesType && matchesStatus) {
      view.push(record);
    }
  }

  if (jump === "first") {
    page = 1;
  } else if (jump === "last") {
    page = pageCount();
  } else if (jump === undefined) {
    page = 1;
  }

  render();
}

function search() {
  applyFilter("first");
}

function clearSearch() {
  document.getElementById("searchText").value = "";
  document.getElementById("searchField").value = "all";
  document.getElementById("typeFilter").value = "all";
  document.getElementById("statusFilter").value = "all";
  applyFilter("first");
}


/* 9. ADD / EDIT MODAL */

// called by the + Add record button
function addRecord() {
  openModal("add", null);
}

// called by the Edit button inside a table row
function editRow(caseId) {
  openModal("edit", caseId);
}

function openModal(how, caseId) {

  mode = how;
  editCaseId = caseId;

  var record;

  if (how === "add") {
    // a blank record with sensible starting values
    record = {
      caseId: nextCaseId(),
      name: "",
      docType: "PDF",
      date: todayDate(),
      status: "Pending",
      remarks: ""
    };
    document.getElementById("mTitle").textContent = "Add record";
    document.getElementById("saveBtn").textContent = "Add record";
    document.getElementById("mCase").readOnly = false;
  } else {
    record = findRecord(caseId);

    if (record === null) {
      // someone else deleted it since the page was loaded
      showBanner("That record no longer exists. The list has been refreshed.");
      refresh("keep");
      return;
    }
    document.getElementById("mTitle").textContent = "Edit record";
    document.getElementById("saveBtn").textContent = "Save changes";
    document.getElementById("mCase").readOnly = true;   // ID is fixed once created
  }

  // copy the record into the form
  document.getElementById("mCase").value = record.caseId;
  document.getElementById("mName").value = record.name;
  document.getElementById("mType").value = record.docType;
  document.getElementById("mDate").value = record.date;
  document.getElementById("mStatus").value = record.status;
  document.getElementById("mRemarks").value = record.remarks;

  hideError();
  setBusy(false);
  document.getElementById("overlay").classList.add("open");
  document.getElementById("mName").focus();
}

function closeModal() {
  if (busy) {
    return;   // do not close while a save is still in flight
  }
  document.getElementById("overlay").classList.remove("open");
  editCaseId = null;
  hideError();
}

// close only when the dark area around the panel is clicked
function backdropClick(event) {
  if (event.target === document.getElementById("overlay")) {
    closeModal();
  }
}

// Escape closes the dialog from anywhere on the page
document.onkeydown = function (event) {
  if (event.key === "Escape") {
    closeModal();
  }
};

function showError(message) {
  document.getElementById("mError").textContent = message;
  document.getElementById("mError").classList.add("show");
}

function hideError() {
  document.getElementById("mError").classList.remove("show");
}

async function saveRecord() {

  if (busy) {
    return;
  }

  // read the form
  var record = {
    caseId: document.getElementById("mCase").value.trim(),
    name: document.getElementById("mName").value.trim(),
    docType: document.getElementById("mType").value,
    date: document.getElementById("mDate").value,
    status: document.getElementById("mStatus").value,
    remarks: document.getElementById("mRemarks").value.trim()
  };

  // check it before troubling the server
  if (record.caseId === "") {
    showError("Enter a case ID.");
    return;
  }
  if (record.name === "") {
    showError("Enter the applicant name.");
    return;
  }
  if (record.date === "") {
    showError("Choose a date.");
    return;
  }

  hideError();
  setBusy(true);
  document.getElementById("saveBtn").textContent = "Saving\u2026";

  try {

    if (mode === "add") {

      await createRecord(record);
      setBusy(false);
      closeModal();

      // clear the search so the new row is visible, then land on its page
      document.getElementById("searchText").value = "";
      document.getElementById("searchField").value = "all";
      await refresh("last");

    } else {

      await updateRecord(editCaseId, record);
      setBusy(false);
      closeModal();
      await refresh("keep");   // stay on the page the user was viewing
    }

  } catch (error) {
    // the server refused: duplicate ID, missing record, or unreachable
    setBusy(false);
    document.getElementById("saveBtn").textContent =
      (mode === "add") ? "Add record" : "Save changes";
    showError(error.message || "Could not save. Please try again.");
  }
}


/* 10. DELETE */

// called by the Delete button inside a table row
async function deleteRow(caseId) {

  var record = findRecord(caseId);

  if (record === null) {
    await refresh("keep");
    return;
  }

  var ok = confirm("Delete case " + record.caseId + " (" + record.name + ")? " +
                   "This cannot be undone.");

  if (ok === false) {
    return;
  }

  try {
    await deleteRecord(caseId);
    // rebuild the list and redraw; render() moves back a page if this
    // was the last record on the final page
    await refresh("keep");
  } catch (error) {
    showBanner("Could not delete case " + caseId + ". " + (error.message || ""));
  }
}