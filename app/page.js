"use client";

import { useEffect, useRef, useState } from "react";
import WaterScene, { sceneEventOptions } from "./WaterScene";

const storageKey = "water-interval-settings";
const defaults = {
  title: "เหนือผืนน้ำ\nเงียบงัน",
  subject: "torii",
};
const subjects = [
  { value: "torii", label: "ประตูโทริอิ" },
  { value: "moon", label: "แสงจันทร์" },
  { value: "mountain", label: "ภูเขาฟูจิ" },
  { value: "mountain-lake", label: "ทะเลสาบภูเขา" },
];

function normalizeSettings(value) {
  if (!value || typeof value !== "object") return defaults;
  return {
    title: typeof value.title === "string" ? value.title.slice(0, 100) : defaults.title,
    subject: subjects.some((item) => item.value === value.subject) ? value.subject : defaults.subject,
  };
}

export default function Home() {
  const [settings, setSettings] = useState(defaults);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [previewEvent, setPreviewEvent] = useState(null);
  const infoRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSettings(normalizeSettings(JSON.parse(stored)));
      } else {
        const legacy = localStorage.getItem("water-interval-scenes");
        const firstScene = legacy && JSON.parse(legacy)?.[0];
        if (firstScene) {
          setSettings(normalizeSettings({
            title: firstScene.title,
            subject: firstScene.photo === "mountain" ? "mountain" : "torii",
          }));
        }
      }
    } catch {
      setNotice("อ่านฉากที่บันทึกไว้ไม่ได้ กำลังใช้ค่าเริ่มต้นแทน");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!editing && !infoOpen) return;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setEditing(false);
        setInfoOpen(false);
      }
    }
    function onPointerDown(event) {
      if (infoOpen && !infoRef.current?.contains(event.target)) setInfoOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [editing, infoOpen]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      setSaved(true);
      setNotice("บันทึกฉากไว้ในเบราว์เซอร์นี้แล้ว");
      window.setTimeout(() => setNotice(""), 2400);
    } catch {
      setNotice("บันทึกไม่สำเร็จ ลองลดความยาวข้อความแล้วบันทึกอีกครั้ง");
    }
  }

  if (!loaded) return <main className="loading" aria-label="กำลังเปิดฉาก" />;

  return (
    <main id="top" className="experience">
      <WaterScene subject={settings.subject} previewEvent={previewEvent} />
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="ผิวน้ำ หน้าแรก">ผิวน้ำ<span>間</span></a>
        <div className="topline" aria-hidden="true" />
        <div className="topbar-actions">
          <div className="info-control" ref={infoRef}>
            <button className="info-toggle" type="button" aria-label="ข้อมูลและที่มาของภาพ" aria-expanded={infoOpen} aria-controls="scene-info" onClick={() => setInfoOpen((value) => !value)}>i</button>
            {infoOpen && <aside className="info-popover" id="scene-info" aria-label="ข้อมูลและที่มาของภาพ">
              <p className="info-overline">INFO</p>
              <h2>ที่มาของฉาก</h2>
              <ul>
                <li><a href="https://unsplash.com/photos/a-tori-tori-floating-in-the-middle-of-a-body-of-water-2gGPUM_z1XA" target="_blank" rel="noreferrer">ประตูโทริอิ · Wu Hsien Yu</a></li>
                <li><a href="https://unsplash.com/photos/mount-fuji-above-green-forest-WfkxI4wLa3o" target="_blank" rel="noreferrer">ภูเขาฟูจิ · Stefan Szankowski</a></li>
                <li><a href="https://unsplash.com/photos/mountain-range-reflected-in-a-calm-lake-under-blue-sky-oGQivGkfGu8" target="_blank" rel="noreferrer">ทะเลสาบภูเขา · Jeremy Mowery</a></li>
                <li><a href="https://unsplash.com/photos/a-full-moon-over-a-body-of-water-at-night-W4JrRicwY58" target="_blank" rel="noreferrer">แสงจันทร์ · Jason Leung</a></li>
                <li><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">พื้นผิวดวงจันทร์ · NASA / LRO</a></li>
                <li><a href="https://www.innerscene.com/tools/library/3d-parts/fishing-boat-3c5a6bfd" target="_blank" rel="noreferrer">เรือประมง 3D · CC0</a></li>
                <li><a href="https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/BarramundiFish/README.md" target="_blank" rel="noreferrer">ปลา Barramundi 3D · Khronos · CC0</a></li>
                <li><a href="https://www.innerscene.com/tools/library/3d-parts/common-bottlenose-dolphin-a7f74d0e" target="_blank" rel="noreferrer">โลมาปากขวด 3D · Innerscene · CC0</a></li>
                <li><a href="https://www.innerscene.com/tools/library/3d-parts/seagull-dc308258" target="_blank" rel="noreferrer">นกนางนวล 3D · CC0</a></li>
                <li><a href="https://www.innerscene.com/tools/library/3d-parts/maple-street-tree-detailed-leaves-006cddf4" target="_blank" rel="noreferrer">ใบเมเปิล 3D (แยกจากโมเดลต้นฉบับ) · CC0</a></li>
                <li><a href="https://poly.pizza/m/Iip30bDHmu" target="_blank" rel="noreferrer">ผีน้อย 3D · Quaternius · CC0</a></li>
              </ul>
            </aside>}
          </div>
        <button className="edit-toggle" onClick={() => setEditing((value) => !value)} aria-expanded={editing}>
          <span className="edit-mark" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M2.4 11.8 2 14l2.2-.4L13.4 4.4a1.3 1.3 0 0 0-1.8-1.8z" /><path d="m10.6 3.6 1.8 1.8" /></svg></span>
          {editing ? "ปิดเครื่องมือ" : "แก้ไขฉาก"}
        </button>
        </div>
      </header>
      <section className="scene-copy" aria-live="polite">
        <h1>{settings.title.split("\n").map((line, index) => <span key={index}>{line}</span>)}</h1>
      </section>

      <aside className={"editor " + (editing ? "is-open" : "")} aria-hidden={!editing} inert={!editing}>
        <div className="editor-head">
          <div><p className="editor-overline">WATER INTERVAL</p><h2>แก้ไขฉาก</h2></div>
          <button className="close-editor" onClick={() => setEditing(false)} aria-label="ปิดแผงแก้ไข">×</button>
        </div>
        <p className="editor-note">ปรับฉากหลักและข้อความ</p>
        <div className="editor-form">
          <label>ฉากหลัก<select value={settings.subject} onChange={(event) => updateSetting("subject", event.target.value)}>
            {subjects.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select></label>
          <label>ข้อความหลัก<textarea value={settings.title} onChange={(event) => updateSetting("title", event.target.value)} rows={2} maxLength={100} /></label>
        </div>
        <section className="event-test" aria-label="ทดสอบอีเวนต์">
          <div className="event-test-head"><h3>ทดสอบอีเวนต์</h3><button type="button" onClick={() => setPreviewEvent(null)}>หยุดทดสอบ</button></div>
          <div className="event-test-list">
            {sceneEventOptions.map(({ id, label }) => (
              <div className="event-test-row" key={id}>
                <span>{label}</span>
                <div className="event-test-levels">
                  {[1, 2, 3].map((level) => (
                    <button
                      type="button"
                      key={level}
                      aria-label={`ทดสอบ${label}ระดับ ${level}`}
                      aria-pressed={previewEvent?.id === id && previewEvent?.level === level}
                      className={previewEvent?.id === id && previewEvent?.level === level ? "is-active" : ""}
                      onClick={() => setPreviewEvent({ id, level, token: `${Date.now()}-${Math.random()}` })}
                    >{level}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="editor-actions">
          <span className="storage-note">{saved ? "บันทึกแล้ว" : "มีการแก้ไขที่ยังไม่บันทึก"}</span>
          <button className="save-scene" onClick={save}>{saved ? "บันทึกแล้ว" : "บันทึกฉาก"}</button>
        </div>
        <p className="editor-footnote">การเปลี่ยนแปลงบันทึกไว้ในเบราว์เซอร์นี้เท่านั้น</p>
      </aside>
      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  );
}
