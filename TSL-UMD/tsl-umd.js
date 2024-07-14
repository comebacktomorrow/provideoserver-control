const UMD = require('tsl-umd');

const TSL_PORT = 40041;
const TSL_ADDRESS = 2;

let tallyState = -1;

const goUMD = (controller) =>{ 
	var umd = new UMD(TSL_PORT);
	umd.on('message', function(tally) {
		if (tally.address === TSL_ADDRESS) {
            if (tally.tally1 === 1) {
                console.log(`Tally 1 is active for address ${TSL_ADDRESS}`);
				tallyState = 0;
            } else if (tally.tally2 === 1) { //preview
                console.log(`Tally 2 is active for address ${TSL_ADDRESS}`);
				tallyState = 1;
            } else {
				tallyState = -1;
                //console.log(`Tally update for address ${TSL_ADDRESS} with no active tallies:`, tally);
           		}
        }
		controller.setTallyState(tallyState);
	});
}

module.exports = goUMD;