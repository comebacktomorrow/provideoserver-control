import { timecodeToPercentage} from './utils.js';

let selectedClipData = {
  t1: { hours: 0, minutes: 0, seconds: 0, frames: 0 },
  t2: { hours: 0, minutes: 0, seconds: 0, frames: 0 },
  trt: { hours: 0, minutes: 0, seconds: 0, frames: 0 },
  duration: { hours: 0, minutes: 0, seconds: 0, frames: 0 },
  fps: 1
};

const updateTickValues = () => {
  const fps = selectedClipData.fps;
  const t1 = selectedClipData.t1;
  const t2 = selectedClipData.t2;
  const trt = selectedClipData.trt;
  const duration = selectedClipData.duration;
  
  const t1value = timecodeToPercentage(t1, duration, fps);
  const t2value = timecodeToPercentage(t2, duration, fps);
  const trtvalue = timecodeToPercentage(trt, duration, fps);

  return [
      { value: 0, label: 'Start' },
      { value: t1value, label: 'T1' },
      { value: t2value, label: 'T2' },
      { value: trtvalue, label: 'TRT' }
  ];
};

const createBars = () => {
  // const barReduce = 0.9857;
  // const deadband = 0.007; // 1% deadband on both sides


    // Calculate the total width of the bar graph container
    const barGraph = document.getElementById('barGraph');
    const barGraphRect = barGraph.getBoundingClientRect();
    const barGraphWidth = barGraphRect.width;

    const calcDeadband = 1-(barGraphWidth - 5)/barGraphWidth;

    // console.log('width is ' + barGraphWidth);
    // console.log('deadband is ' + (barGraphWidth - 10))
    // console.log('deadband percentage is ' + (calcDeadband))
    
  const barReduce = 1-calcDeadband - 0.009;
  const deadband = calcDeadband; // 1% deadband on both sides
  
  barGraph.innerHTML = ''; // Clear existing bars
  const tickValues = updateTickValues();

  // Sort tick values by their value property
  tickValues.sort((a, b) => a.value - b.value);

  // Add filler at the beginning if the first tick is not 0

    const startFiller = document.createElement('div');
    startFiller.className = 'bar bar-segment';
    startFiller.style.width = `${deadband * 100}%`;
    //startFiller.style.width = '5px';
    barGraph.appendChild(startFiller);


  tickValues.forEach((tick, index) => {
    if (index < tickValues.length - 1) {
      const nextTick = tickValues[index + 1];
      const bar = document.createElement('div');
      bar.className = 'bar bar-segment';

      let startValue = tick.value;
      let endValue = nextTick.value;
      const preAdjustWidth = endValue - startValue;

      //bar.style.backgroundColor = `hsl(${(index * 40) % 360}, 70%, 70%)`;

      // Apply deadband logic
      if (preAdjustWidth != 0) {
        if (startValue !== 0) {
          startValue = (tick.value * (1 - 2 * deadband)) + deadband * 100;
        }

        if (endValue !== 100) {
          endValue = (nextTick.value * (1 - 2 * deadband)) + deadband * 100;
        }
    }

      let width = (endValue - startValue);

      if (endValue !== 100 || startValue !== 0){
         width = (endValue - startValue) * barReduce;
      }

      bar.style.width = `${width}%`;

      // Add class for start and end segments
      if (nextTick.value === 100) {
        bar.classList.add('end');
      }
      if (tick.value === 0) {
        //bar.classList.add('start');
      }

      barGraph.appendChild(bar);
    }
  });

  // Add filler at the end if the last tick is not 100
  if (tickValues[tickValues.length - 1].value == 100) {
    const endFiller = document.createElement('div');
    endFiller.className = 'bar filler';
    endFiller.style.width = `${deadband * 100}%`;
    //barGraph.appendChild(endFiller);
  }
};

const createTicks = () => {
  const ticksContainer = document.getElementById('ticks');
  ticksContainer.innerHTML = ''; // Clear previous ticks
  const tickValues = updateTickValues();

  tickValues.forEach(tick => {
      // Skip values 0 and 100
      if (tick.value === 0 || tick.value === 100) return;

      const tickElement = document.createElement('div');
      tickElement.className = 'tick';

      const label = document.createElement('div');
      label.className = 'tick-label';
      label.innerText = tick.label;

      tickElement.appendChild(label);
      ticksContainer.appendChild(tickElement);
  });
};

const updateTicksPosition = (enableOffset) => {
  const slider = document.getElementById('timeline');
  const sliderRect = slider.getBoundingClientRect();
  const sliderWidth = sliderRect.width;
  let visibleTickIndex = 0; // Separate index for visible ticks
  const tickValues = updateTickValues();

  // Define the offset for margin adjustments
  const offset =10;

  tickValues.forEach(tick => {
      if (tick.value === 0 || tick.value === 100) return;

      const tickElement = document.getElementById('ticks').children[visibleTickIndex];
      // Adjust the position based on the offset and ensure the middle tick is centered correctly
      const tickPosition = ((tick.value / 100) * (sliderWidth - 2 * offset)) + offset - (tickElement.offsetWidth / 2);
      tickElement.style.left = `${tickPosition}px`;

      visibleTickIndex++;
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('timeline');

  // Initial bar and tick creation
  createBars();
  createTicks();
  updateTicksPosition();

  window.addEventListener('resize', updateTicksPosition); // Adjust on window resize

  // Update bars and labels on slider change
  slider.addEventListener('input', () => {
      createBars();
      createTicks();
      updateTicksPosition();
  });

  // Listen for the custom event to update tick values
  document.addEventListener('updateTimelineData', (event) => {
      selectedClipData = event.detail;
      createBars();
      createTicks();
      updateTicksPosition();
  });
});