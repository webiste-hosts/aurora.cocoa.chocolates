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

  const progression = [
    [392.0, 523.25, 587.33],
    [369.99, 493.88, 554.37],
    [349.23, 466.16, 523.25],
    [329.63, 440.0, 493.88]
  ];

  const beatMs = 980;

  const updateMusicUI = () => {
    const label = musicToggle.querySelector('.music-label');
    musicToggle.classList.toggle('is-playing', isPlaying);
    musicToggle.setAttribute('aria-pressed', String(isPlaying));
    musicToggle.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
    if (label) {
      label.textContent = isPlaying ? 'Violin On' : 'Violin Off';
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

  const playViolinChord = (notes, duration = 1.45, volume = 0.026) => {
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    notes.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const vibrato = audioContext.createOscillator();
      const vibratoGain = audioContext.createGain();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      vibrato.type = 'sine';
      vibrato.frequency.setValueAtTime(5.2 + index * 0.3, now);

      vibratoGain.gain.setValueAtTime(2.2 + index * 0.35, now);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(980 + index * 120, now);
      filter.Q.setValueAtTime(0.95, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.2 + index * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now);
      vibrato.start(now);
      osc.stop(now + duration + 0.08);
      vibrato.stop(now + duration + 0.08);
    });
  };

  const playHarmonic = (frequency, delay = 0) => {
    if (!audioContext) {
      return;
    }

    const startAt = audioContext.currentTime + delay;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(frequency, startAt);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, startAt);

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.0075, startAt + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.62);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(startAt);
    osc.stop(startAt + 0.65);
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

      const chord = progression[currentStep % progression.length];
      playViolinChord(chord);

      if (currentStep % 2 === 1) {
        playHarmonic(chord[2] * 2, 0.14);
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

  const startMusic = async () => {
    await ensureAudioContext();
    isPlaying = true;
    runClock();

    const firstChord = progression[currentStep % progression.length];
    playViolinChord(firstChord, 1.5, 0.028);
    playHarmonic(firstChord[1] * 2, 0.12);
    currentStep += 1;
    updateMusicUI();
  };

  const pauseMusic = () => {
    isPlaying = false;
    updateMusicUI();
  };

  musicToggle.addEventListener('click', async () => {
    if (isPlaying) {
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseMusic();
    }
  });

  const attemptAutoStart = async () => {
    if (autoStartHandled || !isPlaying) {
      return;
    }

    autoStartHandled = true;
    try {
      await startMusic();
    } catch (error) {
      // If autoplay is blocked, start on first user interaction while keeping default enabled state.
      const startOnInteraction = async () => {
        window.removeEventListener('pointerdown', startOnInteraction);
        window.removeEventListener('keydown', startOnInteraction);
        try {
          await startMusic();
        } catch (interactionError) {
          isPlaying = false;
          updateMusicUI();
          console.error('Unable to start violin music:', interactionError);
        }
      };

      window.addEventListener('pointerdown', startOnInteraction, { once: true });
      window.addEventListener('keydown', startOnInteraction, { once: true });
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
}
