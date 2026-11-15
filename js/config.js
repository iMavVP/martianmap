/* Project settings. Keep your keys here so replacing other files never wipes them.
   The Google client ID is public by design; never put the client SECRET in any front-end file. */
window.MM_CONFIG = {
  googleClientId: "264927419766-n1pbvk1p3r14i7cqm30a1f6agsjpm2b2.apps.googleusercontent.com",

  // Live solar flare and particle-event alerts in the safety center come from NASA's DONKI space weather database.
  // DEMO_KEY works but is limited to about 30 requests an hour. Get a free personal key at https://api.nasa.gov/
  nasaApiKey: "DEMO_KEY",
  // Set to false to switch the DONKI lookup off (the safety center then asks the crew to confirm with mission control).
  spaceWeather: true
};
