const UMD = require('tsl-umd');

let tallyState = -1;

const goUMD = (controller, port, address) =>{ 
	var umd = new UMD(port);
	umd.on('message', function(tally) {
		if (tally.address === address) {
            if (tally.tally1 === 1) {
                console.log(`Tally 1 is active for address ${address}`);
				tallyState = 0;
            } else if (tally.tally2 === 1) { //preview
                console.log(`Tally 2 is active for address ${address}`);
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