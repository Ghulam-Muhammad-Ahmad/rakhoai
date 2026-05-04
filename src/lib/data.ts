export type RiskLevel = "critical" | "high" | "medium" | "low" | "safe";
export type AvatarTone = "primary" | "accent" | "blue" | "rose" | "slate";

export interface Student {
  id: string;
  name: string;
  initials: string;
  tone: AvatarTone;
  classLabel: string;
  attendance: number;
  fee: string;
  risk: RiskLevel;
  joined: string;
  phone: string;
}

export const STUDENTS: Student[] = [
  { id: "SR-1042", name: "Saanvi Sharma",    initials: "SS", tone: "primary", classLabel: "9 · Math",    attendance: 62, fee: "On time",      risk: "high",     joined: "Jun 2024", phone: "+91 98••• 23" },
  { id: "SR-1018", name: "Ayaan Khan",       initials: "AK", tone: "accent",  classLabel: "10 · Physics", attendance: 88, fee: "On time",      risk: "medium",   joined: "Mar 2024", phone: "+92 31••• 87" },
  { id: "SR-1107", name: "Rhea Chowdhury",   initials: "RC", tone: "blue",    classLabel: "11 · Bio",    attendance: 96, fee: "On time",      risk: "safe",     joined: "Aug 2024", phone: "+91 99••• 02" },
  { id: "SR-1066", name: "Ibrahim Patel",    initials: "IP", tone: "rose",    classLabel: "9 · Chem",    attendance: 41, fee: "Overdue 14d",  risk: "critical", joined: "Jul 2024", phone: "+92 30••• 19" },
  { id: "SR-1129", name: "Maya Reyes",       initials: "MR", tone: "primary", classLabel: "10 · Math",   attendance: 79, fee: "On time",      risk: "medium",   joined: "Sep 2024", phone: "+63 917••• 4" },
  { id: "SR-1153", name: "Omar Yousuf",      initials: "OY", tone: "slate",   classLabel: "11 · Phy",    attendance: 92, fee: "On time",      risk: "safe",     joined: "Oct 2024", phone: "+971 50••• 1" },
  { id: "SR-1071", name: "Fatima Bello",     initials: "FB", tone: "accent",  classLabel: "9 · Eng",     attendance: 70, fee: "Overdue 7d",   risk: "high",     joined: "Jul 2024", phone: "+234 80••• 6" },
  { id: "SR-1090", name: "Vihaan Iyer",      initials: "VI", tone: "blue",    classLabel: "11 · Math",   attendance: 95, fee: "On time",      risk: "safe",     joined: "Aug 2024", phone: "+91 98••• 41" },
];


export interface Intervention {
  id: number;
  student: string;
  initials: string;
  tone: AvatarTone;
  text: string;
  suggested: string;
  when: string;
}

export const INTERVENTIONS: Intervention[] = [
  { id: 1, student: "Saanvi Sharma", initials: "SS", tone: "primary",
    text: "Saanvi's attendance dropped 40% in two weeks. A short call to her parents this week tends to recover students at this stage.",
    suggested: "Call · Parent", when: "Suggested 2h ago" },
  { id: 2, student: "Ibrahim Patel", initials: "IP", tone: "rose",
    text: "Ibrahim has a 14-day fee overdue and missed 3 classes in a row. Send a gentle WhatsApp to confirm everything is okay.",
    suggested: "WhatsApp · Owner", when: "Suggested today" },
  { id: 3, student: "Fatima Bello", initials: "FB", tone: "accent",
    text: "Fatima's engagement score fell after her tutor changed. A 5-minute check-in from the new tutor usually helps.",
    suggested: "Tutor check-in", when: "Suggested yesterday" },
];
