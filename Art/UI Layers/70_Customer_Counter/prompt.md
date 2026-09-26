# پیشخوان و مشتری‌ها — Prompts

Reference همه: `Art/Concept Art/iranian-alchemist-shop-concept-01.png`

## counter
> Game asset, isolated on flat #d8d2c8 background: a wooden customer counter for a Persian fantasy apothecary shop, seen from the front at a slight angle, aged warm wood with a polished top, front panel decorated with a Persian eight-pointed star lattice pattern in turquoise and lapis blue paint (slightly faded), brass coin tray sitting on the counter top, a small burgundy fabric runner draped over one corner. (3:4)

## شخصیت‌ها (الگوی مشترک)
«Game character asset, single isolated character on flat #d8d2c8 background, seen from the waist up facing slightly left, Painterly cozy Persian fantasy game-art style, warm lighting.» (3:4)

- **customer_woman_elder**: elderly Persian woman, kind wrinkled face, warm smile, burgundy headscarf with golden pattern, dark green traditional dress
- **customer_man_worker**: middle-aged Persian working man, tired but friendly weathered face, short dark beard, earth-tone tunic with rolled sleeves, cloth sash
- **customer_woman_young**: young Persian woman, bright curious eyes, turquoise headscarf with lapis trim, cream dress with floral embroidery, small cloth purse
- **customer_man_elder**: elderly Persian man, long white beard, round felt cap, layered brown and lapis robe, wooden cane

## شخصیت‌های جوان (سری دوم — مرجع سبک: `customer_woman_young.png`)
هر ظاهر سه حالت دارد: عادی، `_happy` (لبخند گشاده)، `_sad` (ناراحت، ابروهای گره‌خورده). دو حالت احساسی با همان تصویر عادی به‌عنوان مرجع و دستور «فقط حالت چهره تغییر کند» تولید می‌شوند تا لباس و قاب ثابت بماند. پس‌زمینه با `tools/build_customers.mjs` حذف و هر سه حالت با قاب مشترک trim می‌شوند.

- **customer_woman_merchant**: beautiful young Persian woman merchant, late twenties, confident, saffron-yellow silk headscarf with lapis border, deep crimson kaftan with gold buttons, brass hand-scale
- **customer_woman_scribe**: young Persian woman scribe, intelligent eyes, deep indigo headscarf with silver pattern, ivory robe with ink-stained cuffs and turquoise vest, reed pen and leather notebook
- **customer_woman_weaver**: young Persian woman weaver, warm gentle face, rose-pink headscarf with silver trim, olive-green dress, colorful yarn skeins over the shoulder, wooden shuttle
- **customer_woman_healer**: serene young Persian woman healer, white headscarf with teal edge, sage-green robe with copper shawl, herb pouch and copper bowl
- **customer_man_scholar**: handsome young Persian man scholar, trimmed dark beard, navy turban with gold pin, plum robe over cream shirt, leather-bound book
- **customer_man_musician**: charming young Persian man musician, long wavy hair, thin mustache, burgundy felt cap, turquoise-and-gold embroidered vest, Persian tar

## سری سوم — جوان، بیشتر دختر، چهره‌های متفاوت (+ بازساخت man_worker با قاب مشترک)
همان الگو؛ حالت‌های احساسی با «Edit the reference image … change ONLY the facial expression» از تصویر عادی.

- **customer_woman_student**: young Persian woman student (~19), round soft face with dimples, large dark eyes, cobalt-blue headscarf with tiny white stars, mustard-yellow dress, leather satchel of books, small brass inkpot
- **customer_woman_florist**: young Persian woman flower-seller (~22), light freckles, gentle smile, coral-pink headscarf with green vine trim, sage-green dress embroidered with tulips, wicker basket of red poppies and jasmine
- **customer_woman_noble**: elegant young Persian noblewoman (~24), oval face, high cheekbones, arched brows, emerald-green silk headscarf edged with pearls, ivory-and-gold brocade dress, ruby necklace, ornate fan
- **customer_woman_traveler**: young Persian woman traveler (~25), sun-tanned, strong brows, wavy hair under a dusty-rose headscarf, tan travelling cloak over turquoise tunic, leather water flask on a strap
- **customer_woman_baker**: young Persian woman baker (~21), rosy round cheeks, white headscarf tied with a lavender ribbon, apricot dress with flour-dusted apron, round golden flatbread
- **customer_man_apprentice**: young Persian man apprentice poet (~18), clean-shaven, curly hair under a small green felt cap, striped blue-and-cream tunic, bundle of scrolls
- **customer_man_worker** (بازساخت): Persian working man in his early thirties, friendly weathered face, short dark beard, brown tunic with rolled sleeves, dark red sash, wooden mallet on the shoulder

## سری چهارم — دخترهای ۱۹ تا ۳۵، چهره‌های جدا، روسریِ شُل
هر ظاهر سه حالت دارد (عادی، `_happy`، `_sad`). روسری مد است و بیشتر مو بیرون است؛ یقه بازتر از سری‌های قبلی. پس‌زمینه با `tools/build_customers.mjs` حذف می‌شود.

- **customer_woman_potter**: 19, round freckled face, honey-amber eyes, copper-red waves, loose terracotta scarf, turquoise dress, painted jug
- **customer_woman_painter**: 22, pale heart-shaped face, grey-green eyes, black blunt bangs, sheer lilac scarf, plum velvet, brush and palette
- **customer_woman_singer**: 27, warm tan skin, full lips, beauty mark, big black curls, slipped midnight-blue scarf, low sapphire dress, frame drum
- **customer_woman_rider**: 29, angular bronze face, hazel eyes, heavy braid, red bandana, open teal riding coat, bow
- **customer_woman_bride**: 23, dark chestnut curls, dimpled smile, loose ivory lace scarf, off-shoulder gold dress, henna, hand mirror
- **customer_woman_perfumer**: 26, long face, aquiline nose, sage-green eyes, honey-brown hair, loose pink scarf, rose-embroidered robe, blue rosewater bottle
- **customer_woman_jeweler**: 32, deep-olive skin, silver-streaked bob, loose black-and-gold scarf, gold brocade, turquoise ring
- **customer_woman_dancer**: 24, curly updo, crimson coin-edged scarf slipped back, off-shoulder crimson-and-gold costume, gold veil
- **customer_woman_astronomer**: 34, mature face, a few silver strands, loose starry indigo scarf, midnight robe, brass astrolabe

## سری پنجم — باز هم روسریِ شُل، یقه بازتر، چهره‌های جدا از سری چهارم
همان الگو و همان پس‌زمینه‌ی #d8d2c8. حالت‌های احساسی فقط با تغییر چهره از تصویر عادی.

- **customer_woman_falconer**: 30, square jaw, bumped nose, short cropped black hair, rust scarf sliding off the crown, saffron riding coat, falcon glove
- **customer_woman_poet**: 24, small face, button nose, chin mole, long straight ash-brown hair, champagne scarf slipped back, cream silk, poem
- **customer_woman_dyer**: 28, broad face, wide nose, nose ring, low black ponytail, indigo scarf on the shoulder, dye-stained hand, magenta skein
- **customer_woman_glass**: 33, long rectangular face, grey eyes, silver streaks in straight black hair, lavender scarf slipped off, smoke-grey keyhole dress, cobalt bottle
- **customer_woman_spice**: 35, smile lines, cat-tilted eyes, lip beauty mark, auburn-black side braid, saffron scarf slipped back, pomegranate dress, spice pouch
- **customer_woman_chess**: 26, widow's peak, low bun, scar through one brow, black-and-gold scarf slipped back, plum silk, gold chess knight
