let tickValues = [
    { value: 0, label: 'Start' },
    { value: 30, label: 'T1' },
    { value: 75, label: 'T2' },
    { value: 90, label: 'TRT' }
  ];

// timeline.js
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('customRange');
    const barGraph = document.getElementById('barGraph');
  
    // Create bars based on tick values
    const createBars = () => {
      barGraph.innerHTML = ''; // Clear existing bars
  
      tickValues.forEach((tick, index) => {
        if (index < tickValues.length - 1) {
          const bar = document.createElement('div');
          bar.className = 'bar';
          bar.style.width = `${tickValues[index + 1].value - tick.value}%`;
          bar.classList.add('bar-segment');
          if (tickValues[index + 1].value == 100) {
            // If the segment reaches 100%, style it with rounded corners
            bar.classList.add('end');
          }
          barGraph.appendChild(bar);
        }
      });
    };
  
    // Initial bar creation
    createBars();
  
    // Update bars on slider change
    slider.addEventListener('input', createBars);
  });



// // script.js
document.addEventListener('DOMContentLoaded', () => {
  const ticksContainer = document.getElementById('ticks');
  const slider = document.getElementById('customRange');

  // Function to create ticks
  const createTicks = () => {
    ticksContainer.innerHTML = ''; // Clear previous ticks
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

  // Function to position ticks based on the slider's width
  const updateTicksPosition = () => {
    const sliderRect = slider.getBoundingClientRect();
    const sliderWidth = sliderRect.width;
    let visibleTickIndex = 0; // Separate index for visible ticks

    tickValues.forEach(tick => {
      if (tick.value === 0 || tick.value === 100) return;

      const tickElement = ticksContainer.children[visibleTickIndex];
      const tickPosition = (tick.value / 100) * sliderWidth - (tickElement.offsetWidth / 2);
      tickElement.style.left = `${tickPosition}px`;

      visibleTickIndex++;
    });
  };

  createTicks();
  updateTicksPosition();

  window.addEventListener('resize', updateTicksPosition); // Adjust on window resize

  // Update bars and labels on slider change
  //slider.addEventListener('input', createBars);
});