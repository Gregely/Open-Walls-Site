/* ============================================================
   tweaks-app.jsx — Open Walls Tweaks panel (React island)
   Writes CSS vars / data-attrs that the vanilla page reacts to.
   ============================================================ */

const OW_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "motion": true,
  "motif": "medium",
  "headingFont": "'TypeFaceGrid', 'Knewave', cursive",
  "accent": "#d94f2b"
}/*EDITMODE-END*/;

function OpenWallsTweaks() {
  const [t, setTweak] = useTweaks(OW_TWEAK_DEFAULTS);

  React.useEffect(function () {
    document.body.dataset.motion = t.motion ? 'on' : 'off';
  }, [t.motion]);

  React.useEffect(function () {
    document.body.dataset.motif = t.motif;
  }, [t.motif]);

  React.useEffect(function () {
    document.documentElement.style.setProperty('--font-display', t.headingFont);
  }, [t.headingFont]);

  React.useEffect(function () {
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.accent]);

  return (
    <TweaksPanel>
      <TweakSection label="Motion" />
      <TweakToggle label="Animations on" value={t.motion}
        onChange={function (v) { setTweak('motion', v); }} />

      <TweakSection label="Motif" />
      <TweakRadio label="Squares" value={t.motif}
        options={['low', 'medium', 'high']}
        onChange={function (v) { setTweak('motif', v); }} />

      <TweakSection label="Type" />
      <TweakSelect label="Heading font" value={t.headingFont}
        options={[
          { value: "'TypeFaceGrid', 'Knewave', cursive", label: 'TypeFaceGrid (custom)' },
          { value: "'Knewave', cursive", label: 'Knewave (hand-cut)' },
          { value: "'Titan One', cursive", label: 'Titan One (chunky)' },
          { value: "'Bagel Fat One', cursive", label: 'Bagel Fat One (fat)' }
        ]}
        onChange={function (v) { setTweak('headingFont', v); }} />

      <TweakSection label="Accent" />
      <TweakColor label="Highlight" value={t.accent}
        options={['#d94f2b', '#f4821f', '#2aa8a0', '#5b4fa0', '#3fad5c', '#b5446a']}
        onChange={function (v) { setTweak('accent', v); }} />
    </TweaksPanel>
  );
}

(function mountTweaks() {
  function go() {
    const el = document.getElementById('tweaks-root');
    if (!el || !window.useTweaks) { setTimeout(go, 60); return; }
    ReactDOM.createRoot(el).render(<OpenWallsTweaks />);
  }
  go();
})();
