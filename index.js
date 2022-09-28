const bookingURL = '/SouthWarkPark/Booking/Book';
const sessionURL = '/v0/VenueBooking/SouthwarkPark/GetVenueSessions';
const bookingParams = ['ResourceID', 'SessionID', 'Date', 'startTime', 'endTime'];
const sessionParams = ['startDate', 'endDate'];
const courtPreference = [3, 1, 4, 2];
const defaultFilters = {
    is_available: true,
    is_full_hour: true
}
const latestFilters = {
    ...defaultFilters,
    is_late_evening: true
}

init()

async function init () {
    const res = await getSessions(7, latestFilters);
    const json = await res.json();
    const sessions = await json.sort(byCourtPreference);

    for (const session of sessions) {
        try {
            bookSession(session);
            break;
        } catch (e) {
            console.warn(e);
        }
    }
}

function byCourtPreference (a, b) {
    return courtPreference.indexOf(a.courtNumber) - courtPreference.indexOf(b.courtNumber);
}

async function getSessions(startOffset = 0, filters = defaultFilters){
    const today = new Date();
    const maxPeriod = today.getHours() >= 20 ? 7 : 6;
    const startDate = dateByOffset(today, startOffset).toISOString().slice(0, 10);
    const endDate = dateByOffset(today, maxPeriod).toISOString().slice(0, 10);
    
    const res = await fetchSessionsRaw(startDate, endDate);
    const json = await res.json();
    const processedData = processRawSessionData(json);

    return filterSessions(processedData, filters);
}

function filterSessions(sessions, opts){
    return sessions.filter(item => (
        Object
            .entries(opts)
            .every(([key, val]) => item[key] == val)
    ))
}

function processRawSessionData(data){
    return data.Resources
        .flatMap(court => court.Days
        .flatMap(day => day.Sessions
        .map(session => {
            return {
                is_available: !!session.Capacity, 
                is_full_hour: session.EndTime - session.StartTime >= 60,
                is_late_evening: session.StartTime >= 1140,
                startTime: session.StartTime,
                endTime: session.EndTime,
                SessionID: session.ID,
                ResourceID: court.ID,
                courtNumber: court.Number,
                Date: day.Date.slice(0, 10),
                originalResource: session
            }
    })))
}

function fetchSessionsRaw(startDate, endDate){
    const query = new URLSearchParams({ startDate, endDate }).toString();
    return fetch(`${ sessionURL }?${ query }`);
}

function bookSession(params){
    const validatedOpts = reduceObject(params, bookingParams);
    const query = new URLSearchParams(validatedOpts).toString();
    return fetch(`${ bookingURL }?${ query }`);
}

/**
 * Helpers
 */

function dateByOffset(date, offset){
    let newDate = new Date(date + offset);
    newDate.setDate(date.getDate() + offset);
    return newDate;
}

function reduceObject(obj, validKeys){
    return Object.fromEntries(
        Object.entries(obj).filter(([key,]) => validKeys.includes(key))
    )
}