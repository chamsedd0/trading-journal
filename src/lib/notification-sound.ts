/**
 * Utility for playing notification sounds
 */

let audioContext: AudioContext | null = null;

// Initialize audio context on first user interaction
export const initAudio = (): void => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  } catch (error) {
    console.error('Failed to create AudioContext:', error);
  }
};

// Play notification sound
export const playNotificationSound = (): void => {
  try {
    if (!audioContext) {
      initAudio();
    }
    
    if (!audioContext) return;
    
    // Create an oscillator for a simple beep sound
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    
    // Create a gain node to control volume
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Set volume to 10%
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5); // Fade out
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play the sound
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5); // Stop after 0.5 seconds
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

// Play message sound (different tone)
export const playMessageSound = (): void => {
  try {
    if (!audioContext) {
      initAudio();
    }
    
    if (!audioContext) return;
    
    // Create oscillator with different tone for messages
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(698.46, audioContext.currentTime); // F5 note
    
    // Create a gain node to control volume
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Set volume to 10%
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play the sound
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3); // Stop after 0.3 seconds
  } catch (error) {
    console.error('Failed to play message sound:', error);
  }
}; 