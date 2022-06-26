const trackingIDElem = document.getElementsByClassName("pt-delivery-card-trackingId")[0];
// TI = Tracking ID, TIGroup since it's the group of elements describing tracking information
const TIGroup = trackingIDElem.parentElement.children;
const delivererElem = TIGroup[0].innerHTML;
let temp = delivererElem.split(" ");
const deliverer = temp.pop();
const seeUpdatesLink = TIGroup[2];

const isDeliveredByAmazon = "Amazon" === deliverer;
if (isDeliveredByAmazon) {
  seeUpdatesLink.click();
  // also known as TEC
  const trackingEventsContainer = document.getElementById("tracking-events-container");

  const TECRows = trackingEventsContainer.children[0].children;
  // Only rows without any other classes have the info we need
  let trackingEvents = [];
  for (let i = 0; i < TECRows.length; i++) {
    const row = TECRows.item(i);
    const isTrackingRow = 1 === row.classList.length;
    if (isTrackingRow) trackingEvents.push(row);
  }

  // https://stackoverflow.com/a/13566675
  function monthIntOfMonthString(mon) {
    return new Date(Date.parse(mon +" 1, 2012")).getMonth()+1
  }

  trackingEvents.reverse();
  let trackingEventChildren = trackingEvents.map(te => {
    const dateHeading = te.children.item(0).querySelector(".tracking-event-date").innerHTML.split(" ");
    const monthStr = dateHeading[1];
    const dayStr = dateHeading[2];
    let children = {
      month: monthIntOfMonthString(monthStr),
      day: parseInt(dayStr),
      events: []
    };

    // now reverse the rest
    const teChildrenLength = te.children.length;
    for (let i = 1; i < teChildrenLength; i++) {
      children.events.push(te.children.item(teChildrenLength - i));
    }
    return children;
  });

  // Ignore the very first event, which is usually just a "Carrier picked up package"
  trackingEventChildren[0].events.shift();

  // only keep an event if it is one where a package left or arrived at a facility
  let filteredTE = trackingEventChildren.map(te => {
    return {
      month: te.month,
      day: te.day,
      events: te.events.filter(ev => {
        const messageElem = ev.querySelectorAll(".tracking-event-message").item(0);
        const message = messageElem.innerHTML;
        return message.includes("left") || message.includes("arrived") || message.includes("out for delivery");
      })
    };
  });

  // convert to just locations and timestamps
  const TELocTimesUnflattened = filteredTE.map(te => {
    const now = new Date();
    const year = now.getFullYear();

    return te.events.map(ev => {
      const timeElem = ev.querySelectorAll(".tracking-event-time").item(0);
      const locElem = ev.querySelectorAll(".tracking-event-location").item(0);
      let timeArr =timeElem.innerHTML.split(":");
      timeArr[1] = timeArr[1].split(" ");
      timeArr = timeArr.flat();
      timeArr[0] = parseInt(timeArr[0]);
      timeArr[1] = parseInt(timeArr[1]);
      const hour = timeArr[0] + (timeArr[2] === "AM" ? 0 : 12);
      const minute = timeArr[1];

      const locationStr = locElem.innerHTML;

      return {
        locationStr: locationStr,
        timestamp: new Date(year, te.month, te.day, hour, minute)
      };
    });
  });
 const TELocTimes = TELocTimesUnflattened.flat();

  /*
  `journey` is list of edges in the travel graph, starting from the first location to the last location.
  Each edge contains the starting location and ending location, and the start and ending timestamps, in that order
  e.g. journey[0] === {
      locations: ["Cateret, New Jersey, US", "New York, New York, US"],
      timestamps: [new Date(2022, 06, 20, 05, 02), new Date(2022, 06, 20, 05, 27)]
    }
  */
  let journey = [];

  for (let i = 0; i < TELocTimes.length-1; i++) {
    const currLocTime = TELocTimes[i];
    const nextLocTime = TELocTimes[i+1];

    journey[i] = {
      locations: [currLocTime.locationStr, nextLocTime.locationStr],
      timestamps: [currLocTime.timestamp, nextLocTime.timestamp]
    };
  }

  // just use time deltas for now since have to quickly submit for Hackathon :P
  const timeDeltas = journey.map(delta => {
    const timeStart = delta.timestamps[0];
    const timeEnd = delta.timestamps[1];
    // divide by a thouand to convert from
    return (timeEnd - timeStart)/1000;
  });

  const carbonDeltas = timeDeltas.map(timeDelta => {
    // assume average truck speed of 55 miles per hour
    // https://www.energy.gov/eere/vehicles/fact-671-april-18-2011-average-truck-speeds
    const avgSpeed = 55 * (1/(60*60)); // miles per second
    const distanceTraveled = avgSpeed * timeDelta; // miles

    // assume 161.8 g emitted per ton-mile, with 20-ton load
    // https://business.edf.org/insights/green-freight-math-how-to-calculate-emissions-for-a-truck-move/
    // rounded that 20 down to 5 to account for the fact that not all deliveries are going to be that heavy, especially within a dense city like NYC
    const carbonDelta = distanceTraveled * 5 * 161.8 / 1000000; // metric ton CO2
    return carbonDelta;
    });

  const totalCarbon = carbonDeltas.reduce((acc, x) => acc + x);
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  alert(`We estimate ${formatter.format(totalCarbon)} metric tons of carbon were used.`);
}
