/**
 * Easy passages — everyday words, short sentences.
 *
 * Each entry stands alone, so any two can sit next to each other without
 * reading as a broken thought. Measured average word length is ~3.8 characters;
 * `npm run check:passages` measures every entry against its band.
 *
 * No apostrophes anywhere: easy mode strips punctuation, and it keeps the
 * source readable as plain quoted strings.
 */
export const EASY_PASSAGES: string[] = [
  'The rain started just after lunch. We sat by the window and watched it fall on the garden. The cat came in from the shed and shook water from her fur. Later the sun came back and the whole street looked clean and bright.',

  'My dog waits by the door every morning. He knows the sound of my shoes on the stairs. When I reach for his lead he spins in a circle and knocks the mat out of place. We walk to the park and back before the town wakes up.',

  'The bread takes all morning but the work is simple. Mix the flour with warm water and salt. Leave it in a bowl near the stove. Come back when it has grown to twice the size, then shape it and bake it until the top turns dark gold.',

  'There is an old apple tree at the end of the field. In spring it fills with white flowers and the bees find it within a day. By autumn the fruit drops into the long grass and the birds get most of it before we do.',

  'She keeps her tools in a wooden box under the bench. Each one has a worn handle and a place it belongs. When a chair breaks she takes the box outside, works in the shade for an hour, and the chair lasts another ten years.',

  'The bus comes at ten past seven. If it rains the whole queue moves under the shop front and nobody says much. On clear days people stand apart and watch the road. The driver knows most of us by name and waits if he sees you running.',

  'We swim early, before the beach fills up. The water is cold for the first minute and fine after that. My brother goes straight out to the rocks. I stay closer in, float on my back, and watch the gulls turn above the cliff.',

  'The kitchen smells of onions and warm oil. Soup is the easy answer on a cold night. Whatever is left in the box goes in the pot with water and salt, and an hour later there is enough for two days.',

  'Snow fell all night and the town was quiet in the morning. No cars moved on our road. Children pulled sleds up the hill behind the school and came down shouting. By noon the main street was wet and grey again.',

  'He learned to ride on a bike that was far too big. His feet barely reached and he fell into the hedge more than once. His mother watched from the gate and did not help. By the end of the week he rode the whole lane on his own.',

  'The library on the corner has three small rooms. One is full of books for children with bright covers and torn pages. The old chair by the window is the best seat in the building and it is always taken by four in the afternoon.',

  'We plant seeds in small pots on the ledge. Most of them come up within two weeks. The rest never do and we never learn why. When the green shoots are tall enough we move them out to the bed by the wall.',

  'The river runs low in summer and you can walk across on the stones. In winter it fills the whole bank and moves fast and brown. The bridge has stood there for two hundred years and shows no sign of giving up.',

  'My grandmother wrote letters every Sunday. She used blue paper and a pen that leaked. The words ran on for pages about small things, the weather and the price of eggs, and they were the best post of the week.',

  'The market sets up before dawn. Trucks back into the square and men lift crates down in the dark. By eight the stalls are full of fruit and fish and the noise fills the whole street. By two it is all packed away.',

  'There is a clock in the hall that runs four minutes fast. Nobody has fixed it because we all count on it. It has made the family early for trains and weddings for as long as I can remember.',

  'The fire takes a while to catch. You need dry wood, a little paper, and the patience to leave it alone. Once it holds, the whole room warms up and the cat moves to the rug and does not move again all night.',

  'We keep a box of old photos under the bed. Most of them have no names on the back. Faces we half know stand in front of houses we have never seen, squinting into a sun that set fifty years ago.',

  'The cat sleeps in the one square of light that crosses the floor. As the sun moves she moves with it, an inch at a time, until the light climbs the wall and she gives up and finds the chair.',

  'Our street has one tree and it is far too large for the space. Its roots have lifted the path and the council writes letters about it every spring. Nobody wants it cut down, so nothing ever happens.',

  'He makes tea the same way every day. Boil the water fully. Warm the pot first. Wait four minutes, no more and no less. He has explained the method many times and nobody else has ever got it quite right.',

  'The lamp by the bed has a loose shade that tips if you touch it. I have meant to fix it for a year. Instead I have learned to reach past it in the dark without knocking it over, which took about a week.',

  'Summer nights we ate outside on a table that wobbled on the grass. Someone always put a folded card under one leg. The food went cold quickly but nobody minded, and we stayed out until the sky went fully dark.',

  'The old boat has not been in the water for years. It sits on blocks behind the shed with a sheet over the top. Every spring he says he will fix it, and every spring the sheet goes back on.',

  'Birds come to the feeder as soon as the house goes quiet. Small brown ones first, then the loud ones that chase the others off. We fill it twice a week and still it empties faster than that.',

  'I walk the same route each evening. Past the shop, up the hill, left at the church, and home along the back lane. It takes thirty minutes and I have done it so often I could do it with my eyes closed.',

  'The shoes lasted eight years, which is more than anyone expected. They were mended twice by a man in a shop the size of a cupboard. When they finally gave up I could not find a pair that felt the same.',

  'Rain on a tin roof is the best sound there is. It starts slow, a few taps, then builds until you have to raise your voice. Ten minutes later it stops all at once and the whole world drips.',

  'The farm sells eggs from a shed at the gate. There is a box for coins and nobody checks it. The eggs are warm in the morning and brown and the yolks are a deep orange you do not get in shops.',

  'We kept a map on the wall with pins in it. Blue for places we had been, red for places we meant to go. After ten years there were far more red pins than blue, which felt about right.',

  'The stars are better here than in town. On a clear night you can see the band of light across the middle of the sky. We lie on the grass until the cold comes through our coats and drives us in.',

  'She reads three books at once and keeps them in different rooms. One by the bed, one in the kitchen, one in her bag. She says she never mixes them up, though the plots must blur a little by now.',

  'The door sticks in wet weather. You have to lift it slightly and push with your shoulder. Guests always struggle and we always forget to warn them, so there is a small thump before every visit.',

  'Our first car was older than I was and broke down often. We learned to carry water, oil, and a rope. Half the trips ended at the side of a road, and those are the ones I remember best.',

  'The pond freezes over for a few weeks each year. The ice is never thick enough to walk on, though someone tries every winter. Ducks stand about on the edge looking put out by the whole thing.',

  'Bread and cheese and an apple is a fine lunch. It needs no plate and no washing up. We eat it on a wall in the sun with our legs hanging down and it beats anything you can buy.',

  'He built the shelf himself and it is not quite level. Books slide slowly to the left over a month. Rather than fix it he simply pushes them back, which he says takes less time than doing it properly.',

  'The wind came up in the night and took two tiles off the roof. We found them in the yard in the morning, broken in three pieces each. The rest of the roof held, which was more than we hoped.',

  'There is a bench at the top of the hill with a small brass plate on it. It names a man who walked up there every day for forty years. We sit on it each time and get our breath back.',

  'The kettle takes too long and we all stand and wait for it. Nobody goes to do something else. It is one of the few times in the day when three people stand in one room and say nothing at all.',
]
