const revealItems = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => observer.observe(item));

const tiltCards = document.querySelectorAll('.tilt-card');

tiltCards.forEach((card) => {
  card.addEventListener('mousemove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = ((y / rect.height) - 0.5) * -8;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
  });
});

const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  const isScrolled = window.scrollY > 20;
  header.style.borderColor = isScrolled
    ? 'rgba(255, 214, 153, 0.36)'
    : 'rgba(255, 214, 153, 0.2)';
});

const heroCard = document.querySelector('.hero-logo-card');
window.addEventListener('mousemove', (event) => {
  const x = (event.clientX / window.innerWidth - 0.5) * 10;
  const y = (event.clientY / window.innerHeight - 0.5) * -10;
  heroCard.style.transform = `translate3d(${x * 0.5}px, ${y * 0.5}px, 0)`;
});

const musicToggle = document.querySelector('.music-toggle');

if (musicToggle) {
  let audioContext;
  let isPlaying = true;
  let isClockRunning = false;
  let noteTimer;
  let currentStep = 0;
  let autoStartHandled = false;
  let interactionAutoStartBound = false;

  const melodySequence = [
    { note: 523.25, duration: 0.48 },
    { note: 659.25, duration: 0.42 },
    { note: 783.99, duration: 0.7 },
    { note: 739.99, duration: 0.38 },
    { note: 659.25, duration: 0.5 },
    { note: 587.33, duration: 0.42 },
    { note: 659.25, duration: 0.55 },
    { note: 523.25, duration: 0.85 }
  ];

  const backingProgression = [
    [261.63, 329.63, 392.0],
    [293.66, 369.99, 440.0],
    [220.0, 293.66, 349.23],
    [246.94, 311.13, 392.0]
  ];

  const beatMs = 760;

  const updateMusicUI = () => {
    const label = musicToggle.querySelector('.music-label');
    musicToggle.classList.toggle('is-playing', isPlaying);
    musicToggle.setAttribute('aria-pressed', String(isPlaying));
    musicToggle.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
    if (label) {
      label.textContent = isPlaying ? 'Music On' : 'Music Off';
    }
  };

  const ensureAudioContext = async () => {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  };

  const playMelodyLead = (frequency, duration = 0.55, volume = 0.032) => {
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const vibrato = audioContext.createOscillator();
    const vibratoGain = audioContext.createGain();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);

    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(5.6, now);
    vibratoGain.gain.setValueAtTime(3.2, now);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1700, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    vibrato.start(now);
    osc.stop(now + duration + 0.08);
    vibrato.stop(now + duration + 0.08);
  };

  const playBackingPad = (notes, duration = 1.3, volume = 0.016) => {
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    notes.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700 + index * 130, now);
      filter.Q.setValueAtTime(0.7, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + duration + 0.06);
    });
  };

  const runClock = () => {
    if (isClockRunning) {
      return;
    }

    isClockRunning = true;
    noteTimer = window.setInterval(() => {
      if (!isPlaying || !audioContext) {
        return;
      }

      const melody = melodySequence[currentStep % melodySequence.length];
      const backing = backingProgression[Math.floor(currentStep / 2) % backingProgression.length];

      playMelodyLead(melody.note, melody.duration, 0.03);

      if (currentStep % 2 === 0) {
        playBackingPad(backing, 1.25, 0.014);
      }

      currentStep += 1;
    }, beatMs);
  };

  const stopClock = () => {
    if (!isClockRunning) {
      return;
    }

    window.clearInterval(noteTimer);
    isClockRunning = false;
  };

  const isAudioActuallyRunning = () => {
    return Boolean(audioContext) && audioContext.state === 'running' && isClockRunning;
  };

  const startMusic = async () => {
    await ensureAudioContext();
    isPlaying = true;
    runClock();

    const introMelody = melodySequence[currentStep % melodySequence.length];
    const introBacking = backingProgression[0];
    playMelodyLead(introMelody.note, 0.8, 0.031);
    playBackingPad(introBacking, 1.35, 0.015);
    currentStep += 1;
    updateMusicUI();
  };

  const pauseMusic = () => {
    isPlaying = false;
    updateMusicUI();
  };

  musicToggle.addEventListener('click', async () => {
    if (isPlaying) {
      if (!isAudioActuallyRunning()) {
        try {
          await startMusic();
        } catch (error) {
          console.error('Unable to start melody music:', error);
        }
        return;
      }

      pauseMusic();
    } else {
      try {
        await startMusic();
      } catch (error) {
        // Browsers can reject playback without interaction or with blocked audio settings.
        console.error('Unable to start music:', error);
      }
    }
  });

  document.addEventListener('visibilitychange', async () => {
    if (!audioContext || !isPlaying) {
      return;
    }

    if (document.hidden && audioContext.state === 'running') {
      await audioContext.suspend();
    }

    if (!document.hidden && audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (error) {
        console.error('Unable to resume melody music:', error);
      }
    }
  });

  const attemptAutoStart = async () => {
    if (autoStartHandled || !isPlaying) {
      return;
    }

    autoStartHandled = true;

    const removeInteractionAutoStart = () => {
      if (!interactionAutoStartBound) {
        return;
      }

      window.removeEventListener('pointerdown', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
      interactionAutoStartBound = false;
    };

    const startOnInteraction = async (event) => {
      if (event.type === 'pointerdown' && musicToggle.contains(event.target)) {
        return;
      }

      removeInteractionAutoStart();
      try {
        await startMusic();
      } catch (interactionError) {
        isPlaying = false;
        updateMusicUI();
        console.error('Unable to start melody music:', interactionError);
      }
    };

    try {
      await startMusic();
    } catch (error) {
      // If autoplay is blocked, start on first non-button user interaction.
      if (!interactionAutoStartBound) {
        window.addEventListener('pointerdown', startOnInteraction);
        window.addEventListener('keydown', startOnInteraction);
        interactionAutoStartBound = true;
      }
    }
  };

  window.addEventListener('beforeunload', () => {
    stopClock();
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
  });

  updateMusicUI();
  attemptAutoStart();
  window.addEventListener('load', attemptAutoStart, { once: true });
}
