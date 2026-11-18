import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { iso, pretty, time12 } from "../utils/helpers";
import { useCol } from "../utils/useCol";
import { Place } from "./Place";

export function MeetingBanner({ me }) {
  const meetings = useCol("meetings");
  const today = iso(new Date());
  const unseen = meetings.filter((m) => m.date >= today && m.attendees?.includes(me.uid) && !m.seenBy?.includes(me.uid));
  return unseen.map((m) => (
    <div key={m.id} className="banner">
      <div><strong>{m.createdByName} called a meeting: {m.title}</strong>
        <div>{pretty(m.date)} at {time12(m.time)}{m.place && <> · <Place p={m.place} /></>}</div></div>
      <button className="btn" onClick={() => updateDoc(doc(db, "meetings", m.id), { seenBy: arrayUnion(me.uid) })}>Got it</button>
    </div>
  ));
}
