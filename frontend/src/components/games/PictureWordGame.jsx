import React, { useState, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, CheckCircle, AlertCircle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Image path helper
// PNG files live at /public/images/activities/<filename>
// Naming conventions found in the asset library:
//   Indexed:     {group}_{index}_{word}.png   e.g. 1_0_elephant.png
//   Standalone:  {Word}.png                   e.g. Cooking.png
// ─────────────────────────────────────────────────────────────────────────────
export function activityImagePath(filename) {
  if (!filename) return null;
  if (filename.startsWith('/')) return filename;
  return `/images/activities/${filename}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset catalogue — every PNG available in /public/images/activities/
// Use these keys inside activity JSON `content.items[].picture`
// ─────────────────────────────────────────────────────────────────────────────
export const ACTIVITY_IMAGES = {
  // ── Group 1: Wild Animals ────────────────────────────────────────────────
  elephant:          '1_0_elephant.png',
  giraffe:           '1_1_giraffe.png',
  lion:              '1_2_lion.png',
  penguin:           '1_3_penguin.png',
  butterfly:         '1_4_butterfly.png',
  crocodile:         '1_5_crocodile.png',

  // ── Group 2: Emotions ────────────────────────────────────────────────────
  happy:             '2_0_happy.png',
  sad:               '2_1_sad.png',
  angry:             '2_2_angry.png',
  scared:            '2_3_scared.png',
  surprised:         '2_4_surprised.png',
  thinking:          '2_5_thinking.png',

  // ── Group 3: Food ────────────────────────────────────────────────────────
  apple:             '3_0_apple.png',
  donut:             '3_1_donut.png',
  ice_cream:         '3_2_ice_cream.png',
  pizza:             '3_3_pizza.png',
  noodles:           '3_4_noodles.png',
  salad:             '3_5_salad.png',

  // ── Group 4: Weather ─────────────────────────────────────────────────────
  rainbow:           '4_0_rainbow.png',
  rainy:             '4_1_rainy.png',
  snowy:             '4_2_snowy.png',
  sunny:             '4_3_sunny.png',
  foggy:             '4_4_foggy.png',
  windy:             '4_5_windy.png',
  thunder:           '4_6_thunder.png',
  lightning:         '4_7_lightning.png',

  // ── Group 5: Musical Instruments ─────────────────────────────────────────
  guitar:            '5_0_guitar.png',
  piano:             '5_1_piano.png',
  drums:             '5_2_drums.png',
  trumpet:           '5_3_trumpet.png',
  violin:            '5_4_violin.png',

  // ── Group 6: Famous Landmarks ────────────────────────────────────────────
  castle:            '6_0_castle.png',
  mosque:            '6_1_mosque.png',
  eiffel_tower:      '6_2_eiffel_tower.png',
  statue_of_liberty: '6_3_statue_of_liberty.png',
  temple:            '6_4_temple.png',
  torri_gate:        '6_5_torri_gate.png',

  // ── Group 7: Sports / Actions ────────────────────────────────────────────
  dancing:           '7_0_dancing.png',
  running:           '7_1_running.png',
  swimming:          '7_2_swimming.png',
  cycling:           '7_3_cycling.png',
  boxing:            '7_4_boxing.png',
  jumping:           '7_5_jumping.png',
  tennis:            '7_6_tennis.png',
  archery:           '7_7_archery.png',
  football:          '7_8_football.png',

  // ── Group 8: Science / Space ─────────────────────────────────────────────
  rocket:            '8_0_rocket.png',
  bulb:              '8_1_bulb.png',
  plant:             '8_2_plant.png',
  window:            '8_3_window.png',
  tv:                '8_4_tv.png',
  sofa:              '8_5_sofa.png',
  telescope:         '8_6_telescope.png',
  volcano:           '8_7_volcano.png',

  // ── Group 9: Math Symbols ────────────────────────────────────────────────
  plus:              '9_0_plus.png',
  minus:             '9_1_minus.png',
  multiply:          '9_2_multiply.png',
  divide:            '9_3_divide.png',
  equals:            '9_4_equals.png',
  set_square:        '9_5_set_square.png',

  // ── Standalone ───────────────────────────────────────────────────────────
  accordion:         'Accordion.png',
  bacteria:          'Bacteria.png',
  bathtub:           'Bathtub.png',
  cooking:           'Cooking.png',
  dolphin:           'Dolphin.png',
  magnet:            'Magnet.png',
  milk:              'Milk.png',
  ocean:             'Ocean.png',
  reading:           'Reading.png',
  sleeping:          'Sleeping.png',
  sun:               'Sun.png',
  thermometer:       'Thermometer.png',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PictureWordGame({ activity, onSubmit, submitting }) {
  const rawContent = activity?.content;
  const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
  const items = content?.items ?? [];
  const { speak } = useSettings();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(() => new Array(items.length).fill(null));
  const [selected, setSelected] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-semibold">No questions found for this activity.</p>
      </div>
    );
  }

  const isLastItem   = currentIdx === items.length - 1;
  const allAnswered  = answers.every(a => a !== null);
  const currentItem  = items[currentIdx];
  const currentAnswer = answers[currentIdx];

  // picture field is the raw filename e.g. "1_0_elephant.png"
  const picFilename = currentItem.picture ?? null;
  const imageUrl    = picFilename ? activityImagePath(picFilename) : null;
  const hasImageError = imageErrors[currentIdx];

  const handleImageError = () => {
    setImageErrors(prev => ({ ...prev, [currentIdx]: true }));
  };

  const handlePick = useCallback((opt) => {
    if (currentAnswer !== null) return;
    speak(opt);
    const next = [...answers];
    next[currentIdx] = opt;
    setAnswers(next);
    setSelected(opt);
    setTimeout(() => {
      setSelected(null);
      if (!isLastItem) setCurrentIdx(i => i + 1);
    }, 600);
  }, [answers, currentIdx, currentAnswer, isLastItem, speak]);

  const handleSubmit = () => {
    if (!allAnswered || submitting) return;
    onSubmit({ answers: answers.map(a => a ?? '') });
  };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction || 'Look at each picture and choose the correct word.'}
        </p>
      </div>

      {/* Single item card */}
      <div
        key={currentIdx}
        className="rounded-2xl border-2 p-5 mb-5 animate-pop"
        style={{
          borderColor: currentAnswer !== null ? 'rgba(77,150,255,0.4)' : 'var(--border-color)',
          background: 'var(--bg-card)',
        }}
      >
        {/* Counter & TTS */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-sky bg-sky/10 px-2.5 py-1 rounded-full">
            {currentIdx + 1} / {items.length}
          </span>
          <button
            onClick={() => speak(currentAnswer || 'choose a word')}
            className="p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors"
          >
            <Volume2 size={14} />
          </button>
        </div>

        {/* Picture */}
        <div className="flex justify-center mb-6 min-h-[200px]">
          {hasImageError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <AlertCircle size={32} className="text-rose-500" />
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 text-center">
                Image not found: {picFilename}
              </p>
              <p className="text-xs text-rose-400 text-center">
                Expected at: /images/activities/{picFilename}
              </p>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={currentItem.picture}
              onError={handleImageError}
              className="max-w-full max-h-64 object-contain select-none rounded-lg"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
            />
          ) : (
            <div className="flex items-center justify-center text-gray-400">
              <p className="text-sm">No image available</p>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {(currentItem.options ?? []).map(opt => {
            const isChosen = currentAnswer === opt;
            return (
              <button
                key={opt}
                onClick={() => handlePick(opt)}
                disabled={currentAnswer !== null}
                className="flex items-center justify-center px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95"
                style={{
                  borderColor: isChosen ? '#4D96FF' : 'var(--border-color)',
                  background:  isChosen ? 'rgba(77,150,255,0.12)' : 'var(--bg-primary)',
                  color:       isChosen ? '#4D96FF' : 'var(--text-primary)',
                  cursor:      currentAnswer !== null ? 'default' : 'pointer',
                  opacity:     currentAnswer !== null && !isChosen ? 0.5 : 1,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      {allAnswered && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-3 text-emerald-500">
            <CheckCircle size={16} />
            <span className="text-sm font-bold">All {items.length} answered!</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-game w-full bg-coral text-white text-base"
          >
            {submitting ? 'Checking…' : 'Check Answers'}
          </button>
        </div>
      )}
    </div>
  );
}