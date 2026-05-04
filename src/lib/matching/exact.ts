const ALIASES: Record<string, string> = {
  // student_name
  name: "student_name",
  studentname: "student_name",
  student: "student_name",
  fullname: "student_name",
  studentfullname: "student_name",
  pupilname: "student_name",
  learnername: "student_name",

  // contact_info
  contact: "contact_info",
  contactinfo: "contact_info",
  email: "contact_info",
  phone: "contact_info",
  mobile: "contact_info",
  phonenumber: "contact_info",
  emailaddress: "contact_info",
  contactnumber: "contact_info",
  whatsapp: "contact_info",

  // join_date
  joindate: "join_date",
  joined: "join_date",
  startdate: "join_date",
  enrollmentdate: "join_date",
  enrolldate: "join_date",
  datejoined: "join_date",
  admissiondate: "join_date",
  registrationdate: "join_date",

  // last_session_date
  lastsessiondate: "last_session_date",
  lastsession: "last_session_date",
  lastattendance: "last_session_date",
  lastclass: "last_session_date",
  lastclassdate: "last_session_date",
  lastattended: "last_session_date",
  recentattendance: "last_session_date",
  lastpresent: "last_session_date",

  // attendance_rate
  attendancerate: "attendance_rate",
  attendance: "attendance_rate",
  attendancepercent: "attendance_rate",
  attendancepercentage: "attendance_rate",
  attend: "attendance_rate",
  attendpct: "attendance_rate",
  attendancepct: "attendance_rate",
  presencerate: "attendance_rate",

  // last_payment_date
  lastpaymentdate: "last_payment_date",
  lastpayment: "last_payment_date",
  lastpaid: "last_payment_date",
  paymentdate: "last_payment_date",
  datepaid: "last_payment_date",
  lastfeedate: "last_payment_date",

  // payment_status
  paymentstatus: "payment_status",
  feestatus: "payment_status",
  payingstatus: "payment_status",
  paid: "payment_status",
  paymentstates: "payment_status",
  status: "payment_status",
  feesstatus: "payment_status",

  // total_sessions
  totalsessions: "total_sessions",
  sessioncount: "total_sessions",
  sessions: "total_sessions",
  totalsessioncount: "total_sessions",
  classcount: "total_sessions",
  totalclasses: "total_sessions",
  numclasses: "total_sessions",
  numsessions: "total_sessions",

  // fees_amount
  feesamount: "fees_amount",
  fees: "fees_amount",
  amount: "fees_amount",
  fee: "fees_amount",
  monthlyfee: "fees_amount",
  monthlyamount: "fees_amount",
  tuitionfee: "fees_amount",
  tuition: "fees_amount",
  price: "fees_amount",

  // subject
  subject: "subject",
  course: "subject",
  coursename: "subject",
  subjectname: "subject",
  class: "subject",
  classname: "subject",
  topic: "subject",
  grade: "subject",

  // tutor_assigned
  tutorassigned: "tutor_assigned",
  tutor: "tutor_assigned",
  teacher: "tutor_assigned",
  instructor: "tutor_assigned",
  teachername: "tutor_assigned",
  tutorname: "tutor_assigned",
  assignedtutor: "tutor_assigned",
  assignedteacher: "tutor_assigned",

  // notes
  notes: "notes",
  note: "notes",
  remarks: "notes",
  comments: "notes",
  comment: "notes",
  observations: "notes",
  additionalinfo: "notes",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-().]/g, "");
}

export function exactMatch(
  column: string
): { field: string; confidence: 1.0 } | null {
  const key = normalize(column);
  const field = ALIASES[key];
  if (!field) return null;
  return { field, confidence: 1.0 };
}
