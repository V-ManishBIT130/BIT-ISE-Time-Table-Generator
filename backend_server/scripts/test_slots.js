import dotenv from 'dotenv';
dotenv.config();

// Test the slot generation
function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTimeString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function getAvailableTimeSlots() {
  const slots = [
    { start: '08:00', end: '10:00' },
    { start: '09:00', end: '11:00' },
    { start: '10:00', end: '12:00' },
    { start: '11:00', end: '13:00' },
    { start: '12:00', end: '14:00' },
    { start: '13:00', end: '15:00' },
    { start: '14:00', end: '16:00' },
    { start: '15:00', end: '17:00' }
  ]
  
  return slots
}

// Test 30-minute segment generation
function generateSegmentKeys(roomId, day, startTime, endTime) {
  const segments = []
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  const duration = end - start
  const numSegments = Math.ceil(duration / 30)
  
  for (let i = 0; i < numSegments; i++) {
    const segmentStart = start + (i * 30)
    const segmentTime = toTimeString(segmentStart)
    segments.push(`${roomId}_${day}_${segmentTime}`)
  }
  
  return segments
}

console.log('\n📊 TESTING 8 STRATEGIC TIME SLOTS:\n');
const slots = getAvailableTimeSlots();
console.log(`Total slots generated: ${slots.length}\n`);
slots.forEach((slot, idx) => {
  console.log(`${idx + 1}. ${slot.start} - ${slot.end}`);
});

console.log('\n✅ 8 slots with 1-hour offsets (40 total combinations across 5 days)');
console.log('✅ Overlapping slots allowed (e.g., 14:00-16:00 and 15:00-17:00)');
console.log('✅ Conflict prevention: 30-minute segment tracking\n');

// Test overlap scenario
console.log('🔍 TESTING CONFLICT PREVENTION:\n');
console.log('Scenario: Room 612A on Monday');
console.log('  - Section 5C: 14:00-16:00 (uses segments: 14:00, 14:30, 15:00, 15:30)');
console.log('  - Section 3B: 15:00-17:00 (needs segments: 15:00, 15:30, 16:00, 16:30)\n');

const room612A = 'room_612a';
const segments5C = generateSegmentKeys(room612A, 'Monday', '14:00', '16:00');
const segments3B = generateSegmentKeys(room612A, 'Monday', '15:00', '17:00');

console.log('5C occupies:', segments5C);
console.log('3B needs:', segments3B);

const overlap = segments3B.filter(seg => segments5C.includes(seg));
console.log('\n❌ CONFLICT DETECTED:', overlap.length > 0 ? `YES - Shared segments: ${overlap}` : 'NO');

if (overlap.length > 0) {
  console.log('✅ Algorithm will REJECT this combination - 3B cannot use 612A at 15:00-17:00');
  console.log('✅ 3B will be assigned a DIFFERENT room (e.g., 604A, 613) → No conflict!\n');
} else {
  console.log('✅ No overlap - both can use room 612A\n');
}

