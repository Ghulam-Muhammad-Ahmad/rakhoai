type AliasEntry = { keys: string[]; field: string };

const ALIASES: AliasEntry[] = [
  { field: "student_identifier", keys: ["studentid", "studentcode", "rollno", "regno", "registrationno", "admissionno", "externalid"] },
  { field: "student_name", keys: ["name", "studentname", "student", "fullname", "studentfullname", "pupilname", "learnername"] },
  { field: "contact_info", keys: ["contact", "contactinfo", "contactnumber", "whatsapp"] },
  { field: "email", keys: ["email", "emailaddress", "studentemail", "emailid"] },
  { field: "phone", keys: ["phone", "mobile", "phonenumber", "studentphone", "parentphone", "parentmobile"] },
  { field: "join_date", keys: ["joindate", "joined", "startdate", "enrollmentdate", "enrolldate", "datejoined", "admissiondate", "registrationdate"] },
  { field: "last_session_date", keys: ["lastsessiondate", "lastsession", "lastattendance", "lastclass", "lastclassdate", "lastattended", "recentattendance", "lastpresent"] },
  { field: "attendance_rate", keys: ["attendancerate", "attendance", "attendancepercent", "attendancepercentage", "attend", "attendpct", "attendancepct", "presencerate"] },
  { field: "last_payment_date", keys: ["lastpaymentdate", "lastpayment", "lastpaid", "lastfeedate"] },
  { field: "payment_status", keys: ["paymentstatus", "feestatus", "payingstatus", "paid", "paymentstates", "feesstatus"] },
  { field: "total_sessions", keys: ["totalsessions", "sessioncount", "sessions", "totalsessioncount", "classcount", "totalclasses", "numclasses", "numsessions"] },
  { field: "fees_amount", keys: ["feesamount", "fees", "fee", "monthlyfee", "monthlyamount", "tuitionfee", "tuition", "price"] },
  { field: "monthly_fee", keys: ["monthlyfee", "monthlyamount", "feesamount", "tuitionfee"] },
  { field: "subject", keys: ["subject", "course", "coursename", "subjectname", "class", "classname", "topic", "grade"] },
  { field: "tutor_assigned", keys: ["tutorassigned", "tutor", "teacher", "instructor", "teachername", "tutorname", "assignedtutor", "assignedteacher"] },
  { field: "teacher_name", keys: ["teachername", "teacher", "tutor", "tutorname", "instructor", "assignedteacher"] },
  { field: "teacher_id", keys: ["teacherid", "tutorid", "instructorid", "staffid", "employeeid"] },
  { field: "notes", keys: ["notes", "note", "remarks", "comments", "comment", "observations", "additionalinfo"] },
  { field: "session_date", keys: ["sessiondate", "classdate", "attendancedate", "date"] },
  { field: "session_id", keys: ["sessionid", "classid", "attendanceid"] },
  { field: "attendance_status", keys: ["attendancestatus", "presentabsent", "present", "absent", "status"] },
  { field: "duration_minutes", keys: ["duration", "durationminutes", "minutes", "sessionduration"] },
  { field: "attended_sessions", keys: ["attendedsessions", "presentcount", "attendedclasses"] },
  { field: "payment_id", keys: ["paymentid", "invoiceid", "receiptid", "transactionid", "txnid"] },
  { field: "billing_month", keys: ["billingmonth", "month", "feemonth"] },
  { field: "due_date", keys: ["duedate", "paymentdue", "feeduedate"] },
  { field: "paid_date", keys: ["paiddate", "datepaid", "receiveddate"] },
  { field: "payment_date", keys: ["paymentdate", "datepaid", "paiddate"] },
  { field: "amount", keys: ["amount", "amountpaid", "paidamount", "paymentamount"] },
  { field: "overdue_amount", keys: ["overdueamount", "unpaidamount", "balance", "dueamount"] },
  { field: "method", keys: ["method", "paymentmethod", "mode", "paymentmode"] },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-()./]/g, "");
}

export function exactMatch(
  column: string,
  allowedFields?: readonly string[]
): { field: string; confidence: 1.0 } | null {
  const key = normalize(column);
  const allowed = allowedFields ? new Set(allowedFields) : null;
  const match = ALIASES.find((entry) => entry.keys.includes(key) && (!allowed || allowed.has(entry.field)));
  if (!match) return null;
  return { field: match.field, confidence: 1.0 };
}
