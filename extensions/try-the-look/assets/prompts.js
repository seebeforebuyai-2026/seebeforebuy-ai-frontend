/**
 * See Before Buy AI — Prompt Configuration
 * Single source of truth for all category prompts + keyword maps.
 *
 * STRUCTURE:
 *   PROMPT_CONFIG[main_category] = {
 *     label:        Display name shown in onboarding
 *     defaultPrompt: Used when no sub-category keyword matches
 *     subcategories: {
 *       sub_key: { keywords: [...], prompt: "..." }
 *     }
 *   }
 *   PROMPT_CONFIG._fallback = "..."  // Used when shop has NO category set at all
 *
 * DETECTION ORDER (runtime):
 *   1. Take shop's selected main categories (from backend)
 *   2. For each → scan subcategory keywords against product title+description
 *   3. First keyword match → use that subcategory prompt
 *   4. No match in any selected category → use that main category's defaultPrompt
 *   5. No categories set → use _fallback
 */

const PROMPT_CONFIG = {

  // ─────────────────────────────────────────────
  // INDO WESTERN
  // ─────────────────────────────────────────────
  indo_western: {
    label: 'Indo Western',
    subcategories: {

      jacket_kurti: {
        keywords: [
          'jacket kurti', 'jacket style kurti', 'cape kurti',
          'shrug kurti', 'longline jacket', 'cape set', 'jacket set kurti',
        ],
        prompt: `TASK: Virtual try-on of a Jacket Kurti (2-piece: inner kurti + outer jacket/shrug/cape).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — INNER KURTI: Place the kurti beneath the jacket. Neckline sits correctly at the user's neck. Kurti hem extends below the jacket hem. Reproduce any embroidery/print where visible.
STEP 2 — OUTER JACKET: Sits OVER the kurti as a separate visible layer. Jacket collar frames the neck and shoulders. Jacket front panels hang open naturally OR closed as per product. Sleeve length matches product (3/4 or full). Cast a slight shadow where the jacket overlaps the kurti — never merge the two layers.
STEP 3 — FABRIC: Structured blazer-style jacket → firm shoulders, crisp lapels. Cape/shrug → soft flowing fabric. Heavy embroidery → show raised texture and thread dimension. Inner kurti fabric must look distinct from the jacket.
STEP 4 — LIGHTING: Match the dominant light direction from the user's photo. Jacket catches light on the shoulder and lapel nearest the light. Shadow falls under the jacket collar and where it overlaps the kurti. Embellishments must catch and reflect the light.
SELF CHECK: Both layers clearly visible as separate garments? Jacket sitting OVER the kurti? Kurti hem visible below jacket hem? User's face, skin tone, and body completely unchanged? No extra jewellery or accessories added?
Output the final image only.`,
      },

      indo_western_gown: {
        keywords: [
          'indo western gown', 'indo-western gown', 'fusion gown',
          'embroidered gown', 'anarkali gown', 'floor length gown',
        ],
        prompt: `TASK: Virtual try-on of an Indo Western Gown (full-length gown blending Indian and Western elements).
Image 1 = Product photo. Image 2 = User photo (full body).
STEP 1 — SILHOUETTE: Identify exactly — A-line, fit-and-flare, mermaid, straight/column, or ball gown. Identify neckline: halter, V-neck, sweetheart, round, off-shoulder, or collared. Note sleeve style and Indian element (embroidery, brocade, silk).
STEP 2 — PLACEMENT: Gown starts at the correct neckline position. Side seams follow the user's body naturally. Waistline falls at the user's natural waist. Hem reaches the correct length (floor-length unless product shows otherwise).
STEP 3 — INDIAN EMBELLISHMENT: Zari/gold embroidery → reproduce exact placement, raised metallic shine. Sequin/stone work → each element individually catches light — 3D, never flat. Brocade → woven pattern wraps the body three-dimensionally.
STEP 4 — WESTERN SILHOUETTE: A-line → natural volume at hem. Mermaid → skin-tight through torso and thighs, dramatic flare below knee. Off-shoulder → fabric sits across collarbone exposing shoulders.
STEP 5 — FABRIC: Silk/satin → high sheen, bright highlight, deep shadow in folds. Georgette/chiffon → soft drape, slight translucency. Brocade → stiff, structured, pattern wraps body.
SELF CHECK: Silhouette matches product exactly? Hem at correct length? Indian embellishments accurately placed and textured? Fabric looks correct for its material? User's face and body completely unchanged? No extra accessories added?
Output the final image only.`,
      },

      fusion_dress: {
        keywords: [
          'fusion dress', 'indo western dress', 'indo-western dress',
          'block print dress', 'kalamkari dress', 'ikat dress', 'ajrakh dress',
          'bandhani dress', 'printed midi', 'printed maxi dress',
        ],
        prompt: `TASK: Virtual try-on of a Fusion Dress (Western-cut dress in Indian fabric, or Indian silhouette with Western styling).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — IDENTIFY: Western base (shirt dress, wrap, skater, midi) + Indian elements (block print, bandhani, ajrakh, embroidery). Note length: mini, midi, or maxi.
STEP 2 — PLACEMENT: Neckline at correct position. Button placket (if present) straight and centered. Belt (if product has one) sits at natural waist — not floating. Hem at correct length proportionate to the user's height.
STEP 3 — INDIAN PRINT REPRODUCTION: Block print → exact motif, repeat pattern, colour palette — MUST WRAP around the body, never appear flat. Bandhani → pinched dot texture visible. Ikat → feathered blurred edges of the weave visible. Embroidery at collar/cuffs/hem → exact placement and colour.
STEP 4 — WESTERN DETAILS: Shirt collar lies flat. Wrap dress: front panels overlap at the waist — show the wrap crossing point. Skater dress: fitted bodice, flared skirt from waist. Pleats fall naturally from their stitch points.
SELF CHECK: Indian print reproduced accurately and wrapping the body? Structural details correctly placed? Hem at correct length? Fabric texture accurate? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      dhoti_pant: {
        keywords: [
          'dhoti pant', 'dhoti pants', 'dhoti set', 'dhoti style',
          'dhoti kurti set', 'dhoti salwar',
        ],
        prompt: `TASK: Virtual try-on of a Dhoti Pant outfit (gathered/draped pants + paired top if included).
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — DHOTI DRAPE (MOST CRITICAL): Waistband sits at natural waist or hip as per product. The distinctive dhoti DRAPE between the legs must be reproduced as a gathered fabric fold — NOT a regular trouser crotch seam. The drape has volume and fabric gathering. Fabric is wide and voluminous from waist to thigh. Tapers significantly from calf to ankle.
STEP 2 — UPPER GARMENT (if paired): Crop top ends above the natural waist — midriff visible. Kurta/long top falls to hip or below, covering the waistband.
STEP 3 — FABRIC: Crepe/georgette/rayon → soft flowing drape, the gathered drape area shows fabric movement and volume. Cotton → matte, relaxed, natural creases. The drape must NOT look flat or like a regular trouser leg.
STEP 4 — LIGHTING: Gathered drape between the legs creates deep shadow. Highlight on the outer thigh (widest point). Shadow in the fold of the drape and at gathered areas.
SELF CHECK: Is the dhoti drape between the legs reproduced as a fabric fold (not a seam)? Is the pant wide at the hip and tapering at the ankle? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      crop_top_lehenga: {
        keywords: [
          'crop top lehenga', 'crop top with lehenga', 'lehenga with crop top',
          'western lehenga', 'modern lehenga', 'lehenga set crop',
        ],
        prompt: `TASK: Virtual try-on of a Crop Top + Lehenga set.
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — CROP TOP PLACEMENT: Top ends ABOVE the natural waist — midriff must be exposed. The gap between the top hem and the skirt waistband is the midriff — reproduce this gap exactly. Off-shoulder: fabric sits across the collarbone. Corset: show the boning structure. Reproduce all embellishments on the top.
STEP 2 — LEHENGA SKIRT: Waistband sits at the natural waist (NOT the hip). Skirt volume must be full and three-dimensional. Hem touches or is near the floor. Embroidery/zari border at hem must be fully reproduced.
STEP 3 — MIDRIFF TRANSITION (CRITICAL): The exposed stomach area must look natural. The skin tone in the midriff must exactly match the user's skin tone. Clear visual gap: top ends → skin shows → skirt begins. No blending or merging.
STEP 4 — EMBELLISHMENTS: Zari/gota on lehenga → gold metallic shine with light reflection at raised threads. Sequins/stones on crop top → each element individually catches light — 3D, not flat.
SELF CHECK: Midriff clearly visible? Skin tone in midriff matches user? Lehenga skirt has real volume? Both pieces' embellishments accurately reproduced? User's face unchanged? No extra jewellery?
Output the final image only.`,
      },

      jacket_lehenga: {
        keywords: [
          'jacket lehenga', 'cape lehenga', 'shrug lehenga',
          'lehenga with jacket', 'lehenga with cape', 'sheer jacket lehenga',
        ],
        prompt: `TASK: Virtual try-on of a Jacket Lehenga (lehenga + outer jacket/cape, possibly over an inner choli).
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — LAYERING ORDER: Lehenga skirt is the base. Inner choli is under the jacket. Jacket sits OVER the choli — must look like a genuine outer layer. The jacket must cast a slight shadow on the inner garment where it overlaps. Never merge the jacket and choli into one flat garment.
STEP 2 — JACKET: Shoulders align exactly with the user's shoulder edge. For structured jacket: firm shoulder structure and lapels. For sheer/net cape jacket: reproduce the translucent fabric — inner choli visible through it. The sheer fabric must NOT be rendered as opaque.
STEP 3 — LEHENGA SKIRT: Waistband visible at natural waist below the jacket hem. Skirt volume must be full and three-dimensional. All embroidery, zari, mirror work must be accurately reproduced. Hem near the floor.
STEP 4 — EMBELLISHMENTS: Jacket embroidery → raised thread texture and light reflection. Lehenga → zari glints gold, mirrors catch individual light points. Stone work → 3D refraction, not flat dots.
SELF CHECK: All layers (jacket, choli, skirt) clearly distinct? If sheer jacket — is inner layer visible through it? Lehenga skirt has full volume? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      kurti_jeans: {
        keywords: [
          'kurti with jeans', 'kurti jeans', 'kurti denim',
          'long kurti jeans', 'tunic jeans', 'kurti over jeans',
        ],
        prompt: `TASK: Virtual try-on of a Kurti with Jeans combination.
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — KURTI PLACEMENT: Neckline at correct position (collar, V-neck, round, mandarin). Body follows the user's torso naturally. Sleeves match the user's arm angle. Side slits at the hem (if present) appear on both sides. Embroidery at neckline/hem/sleeves fully reproduced.
STEP 2 — JEANS PLACEMENT: Jeans waistband starts where the kurti hem ends (or slightly overlaps). Straight/skinny jeans follow the leg outline closely. Wide leg/bootcut shows appropriate flare from the knee. Denim wash colour matches exactly (light, medium, dark, or black). Denim DIAGONAL TWILL WEAVE texture must be visible — not a flat colour. Distressing (rips, fading) reproduced at exact locations.
STEP 3 — FUSION JUNCTION: The point where the kurti meets the jeans must look natural. If kurti is worn over jeans: kurti hem sits on top of the denim. The waistband of the jeans is visible below the kurti hem.
STEP 4 — FABRIC CONTRAST: Contrast between the flowing kurti fabric and the structured denim must be clearly visible.
SELF CHECK: Kurti hem correctly positioned relative to jeans waistband? Denim texture visible (not flat colour)? Denim wash matches product exactly? Kurti embellishments accurately reproduced? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      draped_dress: {
        keywords: [
          'draped dress', 'saree style dress', 'pre-draped dress',
          'pre stitched drape', 'one shoulder drape', 'dhoti skirt dress',
          'wrap drape dress',
        ],
        prompt: `TASK: Virtual try-on of a Draped Dress (fabric draped, wrapped, or gathered to create the silhouette).
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — IDENTIFY DRAPE STYLE: Saree-style draped dress (pallu over shoulder), one-shoulder draped, wrap draped, or dhoti-draped skirt with blouse.
STEP 2 — DRAPE PHYSICS (MOST CRITICAL): Draped fabric must obey gravity — folds hang downward, not outward. Show MULTIPLE layers of fabric depth — not a flat surface. Each fold must cast a shadow on the fold beneath it. The fabric edge must hang naturally following gravity.
STEP 3 — SPECIFIC DRAPE RULES: Saree-style: pallu falls over the LEFT shoulder and hangs down the back. One-shoulder: one shoulder covered, the other completely bare. Wrap: front panels overlap, creating a natural V-neckline at the crossing point.
STEP 4 — FABRIC REALISM: Georgette/chiffon → soft flowing, slight transparency, flowing folds. Satin → high sheen, sharp highlight on raised drape folds, deep shadow. Crepe → matte, weighty, smooth curves. The drape MUST look fluid and in motion — not flat.
STEP 5 — GATHER POINTS: Where fabric gathers at a point (shoulder, waist) → show radiating fold lines coming from the gather point. Where fabric flows freely (hem, pallu) → show natural swing and weight.
SELF CHECK: Does the drape look like real draped fabric (multiple layers, fold shadows)? Fabric obeying gravity? Gather points showing radiating fold lines? User's face and body completely unchanged? No extra jewellery?
Output the final image only.`,
      },

    }, // end indo_western subcategories

    defaultPrompt: `TASK: Virtual try-on of an Indo Western garment.
Image 1 = Product photo. Image 2 = User photo.
Instructions: Replace the user's current outfit with the exact garment shown in the product photo. Preserve the garment's exact silhouette, fabric texture, embellishments, and colour. Fit it naturally to the user's body and pose. Reproduce all Indian embellishments (embroidery, zari, prints) with full fidelity — raised thread texture, metallic sheen, pattern wrapping the body three-dimensionally. Keep the user's face, hair, skin tone, and background completely unchanged. No extra jewellery or accessories.
Output the final image only.`,
  },


  // ─────────────────────────────────────────────
  // PARTY WEAR
  // ─────────────────────────────────────────────
  party_wear: {
    label: 'Party Wear',
    subcategories: {

      cocktail_dress: {
        keywords: [
          'cocktail dress', 'cocktail gown', 'party dress', 'sequin dress',
          'bodycon dress', 'fit and flare dress', 'lace dress', 'satin dress',
          'velvet dress', 'mini dress party', 'knee length party',
        ],
        prompt: `TASK: Virtual try-on of a Cocktail Dress (semi-formal to formal short dress).
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — SILHOUETTE: Identify exactly — bodycon, A-line, fit-and-flare, wrap, or structured/peplum. Identify neckline: V-neck, sweetheart, off-shoulder, one-shoulder, halter, or strapless. Identify length: above knee, at knee, or just below knee. Identify embellishment: sequins, lace, satin, velvet, or embroidery.
STEP 2 — NECKLINE PRECISION: Sweetheart → curved neckline following bust, no gap. Off-shoulder → fabric sits ACROSS the collarbone, both shoulders bare, tube of fabric hugs the chest. Strapless → fabric starts at the chest, show structural boning edge, no straps visible. Halter → fabric falls from neck to bust. V-neck → reproduce exact depth.
STEP 3 — EMBELLISHMENT REALISM: Full sequin → each sequin individually catches light, scattered sparkle, never a flat shiny surface. Lace overlay → semi-transparent mesh, fabric visible through it, delicate edges. Satin → high contrast, bright specular highlight at fold peaks, deep shadow in valleys. Velvet → directional pile, colour shift, matte surface — no high-gloss shine. Embroidered bodice → raised thread texture, stone/crystal elements catch light as individual points.
STEP 4 — BODYCON RULE: Fabric clings to the body continuously — no gaps. Show natural body contours through the fabric. Fabric creases at the hip and mid-thigh from body movement.
STEP 5 — FIT-AND-FLARE: Fitted bodice transitions to flared skirt at the exact waistline. Skirt volume is three-dimensional with fabric fullness.
SELF CHECK: Neckline style matches product exactly? Hem at correct length? Sequins rendered as individual light-catching elements? Satin showing directional highlight? Lace semi-transparent? User's face, skin tone, and body completely unchanged? No extra jewellery?
Output the final image only.`,
      },

      evening_gown: {
        keywords: [
          'evening gown', 'ball gown', 'mermaid gown', 'formal gown',
          'maxi gown', 'floor length dress', 'gown party', 'black tie',
          'embellished gown', 'crystal gown', 'beaded gown',
        ],
        prompt: `TASK: Virtual try-on of an Evening Gown (full-length formal gown).
Image 1 = Product photo. Image 2 = Full body user photo (must show full height).
STEP 1 — SILHOUETTE: Ball gown → dramatic full skirt from waist, extreme volume, layers of fabric creating depth. Mermaid/Trumpet → skin-tight from chest to mid-thigh, dramatic flare below the knee, train trails naturally if present. A-line → fitted bodice, gradual flare to floor, elegant flow. Column/Sheath → minimal flare, follows body from shoulder to floor. Empire waist → seam just below the bust, fabric flows from there.
STEP 2 — TRAIN: If present, it must trail behind the user. Train fabric lies on the floor following gravity — not floating. Reproduce train embellishments matching the gown.
STEP 3 — EMBELLISHMENT REALISM: Beaded/Crystal → each bead individually catches light, different densities at bodice vs skirt, bugle beads show directional reflection, crystal facets show multiple light points per stone. Chiffon → soft layers, slight transparency at hem, fabric floats. Tulle → multiple stiff layers creating volume, not opaque — sheer quality visible. Ruched fabric → each gather ridge visible, tension visible between gathers.
STEP 4 — LIGHTING: Evening gowns are designed for dramatic lighting. Beaded fabric → scattered multi-point sparkle across the entire dress. Satin → dramatic single highlight band, very bright, very deep shadow. The gown must look GLAMOROUS — not flat or muted.
SELF CHECK: Silhouette matches product exactly? Hem reaches the floor? Train shown if present? Beads/crystals as individual light points? Tulle showing volume and transparency? Gown looks GLAMOROUS? User's face and body unchanged? No extra jewellery?
Output the final image only.`,
      },

      party_saree: {
        keywords: [
          'party saree', 'shimmer saree', 'sequin saree', 'organza saree',
          'tissue saree', 'net saree', 'embellished saree', 'festive saree',
          'party wear saree',
        ],
        prompt: `TASK: Virtual try-on of a Party Saree (shimmer/sequin/organza/net saree for parties).
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — IDENTIFY SAREE TYPE: Shimmer/sequin georgette, organza (stiff and slightly sheer), tissue silk (metallic threads woven in), net (sheer base with embroidery on top), or heavily embroidered.
STEP 2 — DRAPE STRUCTURE (Nivi Style): 5-7 neat pleats at center-front tucked at the navel — pleats must fall straight and even. Main fabric wraps from right to left at waist level. Pallu falls over the LEFT shoulder and drapes down the back — generous length.
STEP 3 — FABRIC SPECIFICS: Shimmer/sequin → entire saree surface has soft metallic glow, scattered sparkle — NOT a single reflection. Shadow areas still have subtle shimmer — never completely matte. Organza → stiff pleats that hold their shape, slight transparency, dramatic pallu volume. Tissue silk → warm gold metallic glow, intensifies under direct light. Net → sheer base, body visible through it, embroidery floating on the net.
STEP 4 — BORDER AND PALLU: Border runs continuously along the entire hem — never breaks. Reproduce the exact border motif at correct width. Pallu design accurately reproduced — this is the most visible element. If heavy embroidery: each motif in its exact position.
STEP 5 — BLOUSE: Visible at upper body. Ends at the natural waist — midriff visible. Reproduce blouse embellishments exactly where visible.
STEP 6 — LIGHTING: Party saree must SHINE. Shimmer → scattered light like starlight across the surface. Organza → sharp highlight at stiff edges. Tissue silk → warm gold glow. Sequin border → each sequin catches light individually. The overall effect must look festive and luminous.
SELF CHECK: Front pleats neat and even? Pallu falls over the LEFT shoulder? Border continuous and unbroken? Pallu design reproduced? Fabric shimmers appropriately? Blouse visible and correctly placed? User's face unchanged? No extra jewellery?
Output the final image only.`,
      },

      designer_lehenga: {
        keywords: [
          'designer lehenga', 'bridal lehenga', 'wedding lehenga',
          'heavy lehenga', 'embroidered lehenga', 'lehenga choli',
          'reception lehenga', 'zari lehenga', 'kundan lehenga',
          'festive lehenga', 'lehenga skirt',
        ],
        prompt: `TASK: Virtual try-on of a Designer Lehenga (premium heavily embellished lehenga for parties/weddings).
Image 1 = Product photo. Image 2 = Full body user photo.
STEP 1 — IDENTIFY ALL PIECES: Choli/blouse (neckline, sleeve style, embellishment density), lehenga skirt (A-line/circular/panelled/layered), dupatta (if included).
STEP 2 — CHOLI PLACEMENT: Ends at or just above natural waist — midriff exposure as per product. Neckline exactly as product: Deep V → exact depth. Sweetheart → smooth curved edge, no gaps. Cold shoulder → cutouts at exact shoulder position. Off-shoulder → entire shoulder bare. Reproduce ALL embellishments at full density: Zari → raised gold thread above fabric. Kundan → each stone individually set, gold foil base visible, faceted light — NOT flat dots. 3D floral → dimensional petals casting shadows on fabric beneath.
STEP 3 — LEHENGA SKIRT: Waistband visible as a distinct band at natural waist. Skirt has FULL VOLUME — never flat. Circular lehenga → maximum volume, fabric radiates outward dramatically. Panelled → show the join lines between panels, each panel with its own embroidery. Hem is floor-length. Hem border is the most embellished area — reproduce in maximum detail.
STEP 4 — EMBELLISHMENT RULES: Zari → raised metallic threads, warm gold glow, variation in tone across the surface. Kundan/Polki → each stone individually set in gold foil, faceted surface with multiple light points, NEVER flat coloured dots. Mirrors/sequins → each one catches light individually and differently from its neighbour. 3D floral → petals rise off the surface, casting tiny shadows beneath.
STEP 5 — DUPATTA: Drape exactly as shown in product. Fabric follows gravity. Embellishments on dupatta match the set.
STEP 6 — LIGHTING: Lehenga must look OPULENT and LUMINOUS. Zari and metallic embroidery → warm gold glow. Kundan → multiple sparkle points at stone settings. The overall impression must be rich, detailed, and glowing.
SELF CHECK: Choli neckline and sleeve exactly reproduced? Lehenga skirt has full volume? Zari as raised metallic thread? Kundan showing individual stone settings with facets? Mirrors each catching light individually? Dupatta draped exactly as product? Looks OPULENT and glamorous? User's face unchanged? No extra jewellery?
Output the final image only.`,
      },

    }, // end party_wear subcategories

    defaultPrompt: `TASK: Virtual try-on of a Party Wear garment.
Image 1 = Product photo. Image 2 = User photo.
Instructions: Replace the user's current outfit with the exact party wear garment shown. Preserve the silhouette, embellishments, and premium fabric quality exactly. Sequins, stones, and embellishments must each individually catch light — never render as a flat shiny surface. Fit the garment naturally to the user's body and pose. Keep the user's face, hair, skin tone, and background completely unchanged. No extra jewellery or accessories.
Output the final image only.`,
  },


  // ─────────────────────────────────────────────
  // WINTER WEAR
  // ─────────────────────────────────────────────
  winter_wear: {
    label: 'Winter Wear',
    subcategories: {

      parka: {
        keywords: [
          'parka', 'parka jacket', 'winter parka', 'fur hood jacket',
          'heavy winter jacket', 'down parka',
        ],
        prompt: `TASK: Virtual try-on of a Parka Jacket (long heavy-duty winter jacket with fur-trimmed hood).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — VOLUME (MOST CRITICAL): Parka adds significant volume to the body — do NOT slim-fit it. Jacket must look THICK and INSULATED. Shoulder width wider than user's natural shoulders. Body looks padded and substantial. Arms appear thicker inside the jacket from the insulation.
STEP 2 — HOOD: Fur trim around the hood → reproduce as individual strands, fluffy and slightly irregular — NEVER a flat strip of colour. If hood is down → bunches at back of neck naturally. If hood is up → frames the face, fur rim visible around the face opening.
STEP 3 — SHELL MATERIAL: Nylon/polyester → slight sheen, smooth surface, soft broad highlights. Quilted pattern → show stitch lines creating channels, slight puffing of insulation between stitch lines. Waxed canvas → matte waxy surface, canvas texture visible.
STEP 4 — POCKETS: Reproduce ALL pockets at their exact positions — hand warmer pockets (angled side), cargo pockets (thigh area), chest pocket. Show the storm flap over the front zip.
SELF CHECK: Jacket looks bulky and insulated (not slim-fit)? Fur trim looks like individual strands? All pockets reproduced at correct positions? Shell material showing correct texture? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      leather_jacket: {
        keywords: [
          'leather jacket', 'biker jacket', 'moto jacket', 'leather biker',
          'bomber leather', 'faux leather jacket', 'pu leather jacket',
          'asymmetric zip jacket',
        ],
        prompt: `TASK: Virtual try-on of a Leather/Biker Jacket.
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — LEATHER SURFACE: Strong, sharp specular highlight — the brightest point in the image. Shadow side goes very dark — high contrast is the defining quality of leather. Grain texture subtly visible across the surface. At edges (cuffs, collar, pocket seams) the leather shows its thickness.
STEP 2 — BIKER/MOTO SPECIFICS: Asymmetric zip runs diagonally from lower-left to upper-right — this angle is the defining feature, get it exactly right. Small pointed lapels fold back on each side. Sleeve zips at wrist/upper arm reproduced. Waist belt/buckle at lower hem at correct position.
STEP 3 — HARDWARE: Zips → show the teeth, slider, and pull tab. Metal zips → hard specular reflection on the slider. Buckles → show the metal frame and pin. Studs (if present) → dome shape with highlight at peak. All hardware looks like METAL — bright specular highlight.
STEP 4 — CREASES: At the elbow when arm is bent → sharp radiating creases. At the armpit → diagonal crease toward the chest. At the wrist → horizontal creases. Leather ALWAYS has flex creases — never show it completely smooth.
SELF CHECK: Leather surface has a strong sharp specular highlight? Flex creases at elbow, armpit, wrist? For biker: asymmetric zip at correct diagonal angle? All hardware rendered as metal? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      denim_jacket: {
        keywords: [
          'denim jacket', 'jean jacket', 'trucker jacket', 'denim outer',
          'oversized denim', 'cropped denim jacket',
        ],
        prompt: `TASK: Virtual try-on of a Denim Jacket.
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — DENIM TEXTURE (MOST CRITICAL): Denim has a DIAGONAL TWILL WEAVE — weave lines run at a 45-degree angle. This diagonal texture MUST be visible on the jacket surface — not smooth. More visible in lighter washes, subtle in dark washes. At seams: denim layers folded and stitched, show seam thickness. Denim is a HEAVY fabric — holds its shape, resists soft draping.
STEP 2 — WASH REPRODUCTION: Light wash → pale faded blue, uneven fading, lighter at chest/shoulders/pocket edges. Medium wash → classic blue, slight fading at stress points. Dark/Indigo → deep rich indigo, minimal fading. Black denim → true black, may show slight grey at stress points.
STEP 3 — DISTRESSING: Reproduce ALL distressing EXACTLY where it appears in the product. Fading at exact positions. Rips → torn edge with frayed threads hanging. Whiskering → horizontal scratch marks at specific positions. Do NOT add or remove distressing.
STEP 4 — STRUCTURAL DETAILS: Front button closure → correct button count in vertical line. Chest pocket flaps → two symmetrical pockets, each with a button, lying flat. Contrast stitching (orange/yellow thread) at seams and pocket edges. Yoke panel at upper back if visible.
SELF CHECK: Diagonal twill weave texture visible? Wash colour accurate? All distressing at exact product positions? Chest pocket flaps symmetrical? Contrast stitching visible? Fabric looks HEAVY not soft? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      puffer_jacket: {
        keywords: [
          'puffer jacket', 'puffer coat', 'quilted jacket', 'down jacket',
          'padded jacket', 'insulated jacket', 'bubble jacket', 'marshmallow jacket',
        ],
        prompt: `TASK: Virtual try-on of a Puffer Jacket (quilted inflated jacket with horizontal/vertical channels).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — QUILTED CHANNELS (MOST CRITICAL): Each channel is a section of inflated fill separated by a stitch line. BETWEEN stitch lines → fabric PUFFS outward, rounded and three-dimensional. AT the stitch line → fabric is stitched flat, a thin depressed valley. Each channel must look individually inflated — like a row of rounded tubes. Horizontal channels curve slightly to follow the body's shape. For ultra-puff → channels have extreme inflation, almost comically puffy.
STEP 2 — VOLUME: The jacket adds SIGNIFICANT volume to the body — do NOT slim-fit. Regular puffer → moderate puff. Ultra-puff → extreme inflation, marshmallow-like.
STEP 3 — SHELL MATERIAL: Nylon/polyester → slight to moderate sheen, smooth surface. Rounded top of each channel has a bright highlight at its peak. Stitch line valleys are dark. Mid-tone on the puff sides.
STEP 4 — COLOUR BLOCK: If product has colour blocking → reproduce EXACT pattern, each colour starting and ending at the stitch line — precise, not blurred.
SELF CHECK: Channels three-dimensional (rounded puff with depressed stitch valleys)? Each channel looks individually inflated? Jacket looks BULKY and voluminous? Channel direction correct (horizontal/vertical/box)? Nylon sheen present? Colour boundaries at correct positions? User's face unchanged?
Output the final image only.`,
      },

      sweatshirt: {
        keywords: [
          'sweatshirt', 'crew neck sweatshirt', 'graphic sweatshirt',
          'oversized sweatshirt', 'cropped sweatshirt', 'printed sweatshirt',
        ],
        prompt: `TASK: Virtual try-on of a Sweatshirt (crew neck or mock neck pullover, no hood).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — FABRIC TEXTURE: Sweatshirt fleece is soft, slightly textured, and COMPLETELY MATTE. No sheen anywhere on the fabric. Slightly fuzzy edge at the garment outline — subtle pile. Natural wrinkle creases at elbow and underarm.
STEP 2 — GRAPHIC/PRINT REPRODUCTION: If the sweatshirt has a graphic → reproduce EXACTLY. Correct colours, exact design, correct position on the chest. Graphic MUST follow the surface curvature — curving with the chest, not appearing flat. Text → every letter readable and correctly placed. If the graphic has cracking/vintage distress → reproduce that quality.
STEP 3 — RIBBED DETAILS: Crew neck ribbing → distinct 1-2cm rib knit band at neckline, alternating raised and recessed vertical lines. Cuff ribbing → holds the sleeve end close to the wrist, rib texture visible. Hem ribbing → slightly gathers the hem.
STEP 4 — FIT: Oversized → INTENTIONALLY loose, shoulders drop 3-5cm past actual shoulder, visible excess fabric at sides. Cropped → hem ends above the navel, show the midriff clearly.
SELF CHECK: Graphic/text exactly reproduced and following surface curvature? Ribbed cuffs, neckline, and hem band showing rib texture? Fabric completely matte? For oversized: intentionally loose with dropped shoulders? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      hoodie: {
        keywords: [
          'hoodie', 'hooded sweatshirt', 'zip hoodie', 'pullover hoodie',
          'hooded top', 'kangaroo pocket hoodie', 'oversized hoodie',
        ],
        prompt: `TASK: Virtual try-on of a Hoodie (sweatshirt with attached hood).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — HOOD PLACEMENT (MOST CRITICAL): Hood Down → sits at back of neck/upper back as a bunched pile with volume — does NOT flatten against the back. Drawstrings hang from the hood opening down the front of the chest as separate visible cords with aglets at the tips. Hood Up → frames the face and head, face remains fully visible, hood follows the head's shape.
STEP 2 — KANGAROO POCKET: Single large pouch pocket at center-front lower abdomen, spanning hip to hip. Opening at the TOP. Reproduce pocket seam line and any branding/text exactly.
STEP 3 — ZIP-THROUGH (if applicable): Full-length zip from hem to chin, zip pull hanging from the slider. Kangaroo pocket splits into two separate side pockets on zip hoodies.
STEP 4 — FABRIC: Fleece/French terry/heavyweight cotton — COMPLETELY MATTE, no sheen. Slightly fuzzy edge at garment outline. Natural wrinkle creases at elbow and underarm.
STEP 5 — GRAPHIC: Reproduce any graphic, text, or print EXACTLY. Graphic follows the surface curvature — not flat.
SELF CHECK: Hood correctly placed (bunched at back if down, framing face if up)? Drawstrings visible? Kangaroo pocket at correct position? Fabric matte? Oversized → shoulders dropped and body relaxed? Graphic exactly reproduced? Face visible even if hood is up? User's body unchanged? No extra accessories?
Output the final image only.`,
      },

      sweater: {
        keywords: [
          'sweater', 'jumper', 'knit sweater', 'cable knit', 'chunky knit',
          'turtleneck sweater', 'v-neck sweater', 'pullover knit', 'fair isle',
          'wool sweater', 'cashmere sweater', 'ribbed sweater',
        ],
        prompt: `TASK: Virtual try-on of a Sweater/Jumper (knitted top).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — KNIT TEXTURE (MOST CRITICAL): Cable knit → twisted rope-like columns running vertically, each cable twisted above the background stitches, THREE-DIMENSIONAL raised effect, deep shadows between the raised cables. Reproduce the EXACT cable pattern — number of cables, their width. Chunky knit → very large visible individual stitches, thick yarn, bumpy dimensional surface. Fine gauge → small closely spaced stitches, subtle grid. Ribbed → alternating raised and recessed vertical columns, elastic appearance. Fair isle → multi-colour geometric pattern knitted INTO the fabric (not printed), pattern wrapping the body.
STEP 2 — NECKLINE: Turtleneck → collar folds over itself, BOTH layers of the fold visible, sits at mid-neck. Crew neck → ribbed band at base of neck. V-neck → reproduce exact depth. Cowl → draped loose collar with fabric gathering.
STEP 3 — MATERIAL: Chunky wool → soft voluminous, adds noticeable bulk, slightly fuzzy edge. Cashmere/fine merino → lightweight, smooth, soft lustre — not shiny but not fully matte. Cotton sweater → heavy drape, matte surface, more structured.
STEP 4 — LIGHTING: Each raised stitch has a tiny shadow beneath it. Cable knit → strong shadow between cables, cables are the bright elements. The sweater must look WARM and COZY — rich texture, substantial presence.
SELF CHECK: Knit texture clearly visible and accurately reproduced? Cable twists showing correct 3D rope pattern? Neckline correctly reproduced? Turtleneck showing fold-over with both layers? Fabric weight and drape appropriate? Sweater looks warm and textured? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      poncho: {
        keywords: [
          'poncho', 'knit poncho', 'blanket poncho', 'woven poncho',
          'fringe poncho', 'cape poncho',
        ],
        prompt: `TASK: Virtual try-on of a Poncho (single-piece outer garment with no sleeves or fastening).
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — PONCHO STRUCTURE: A poncho is NOT a jacket — no sleeves, no buttons, no zipper. Falls from the shoulders as a single draped piece. The neck opening sits centered at the user's neck. Sides are open — user's arms emerge from the open sides naturally.
STEP 2 — DRAPE AND VOLUME: Poncho drapes OVER whatever the user is wearing beneath — inner clothing peeks out at the sides and hem. It must look like it is resting on the shoulders by gravity — not pinned or fitted. Do NOT slim-fit it — it has generous, loose drape. Fabric falls in soft folds from the shoulder line outward.
STEP 3 — FABRIC TEXTURE: Knitted/chunky knit → KNIT STITCH texture visible — individual stitches on the surface. Cable knit → raised twisted columns reproduced. Woven/blanket → exact geometric or stripe pattern wrapping the body. Fringe at hem → each fringe strand hangs individually following gravity — never flat or merged. Fleece → soft matte surface, completely matte.
STEP 4 — PATTERN: Geometric/tribal patterns → reproduce exact motif, colour, and repeat. Pattern MUST wrap around the body. Stripes must curve with the fabric drape.
SELF CHECK: Poncho draping loosely from shoulders (not fitted)? User's arms emerging from open sides naturally? Knit/woven texture clearly visible? Fringe hanging as individual strands? Pattern wrapping the body? Neck opening centered correctly? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

      general_jacket: {
        keywords: [
          'jacket', 'windbreaker', 'varsity jacket', 'bomber jacket',
          'track jacket', 'utility jacket', 'shacket', 'corduroy jacket',
          'casual jacket', 'zip jacket', 'baseball jacket',
        ],
        prompt: `TASK: Virtual try-on of a Casual/General Jacket.
Image 1 = Product photo. Image 2 = User photo.
STEP 1 — IDENTIFY JACKET TYPE FIRST: Windbreaker (lightweight nylon, bright colours), Varsity/Baseball (wool body + leather sleeves, ribbed collar/cuffs/hem, snap buttons), Track jacket (athletic, stripe detailing on sleeves, zip-through), Utility (multiple cargo pockets, canvas/cotton, structured), Quilted shacket (between shirt and jacket weight, quilted channels), Corduroy (parallel vertical WALE RIDGES running full length), Casual zip jacket (minimal, relaxed fit, zip front).
STEP 2 — MATERIAL RULES: Windbreaker → slight nylon sheen, crinkles at armpit and elbow, vivid accurate colours. Varsity → wool body (matte, textured) CLEARLY DIFFERENT from leather sleeves (specular highlight, grain texture, flex creases) — material transition must be visible at the seam. Corduroy → WALE RIDGES visible running vertically from shoulder to hem, wider wale = more prominent ridges, colour shifts lighter at ridge peaks and darker in the valleys.
STEP 3 — ALL SHARED DETAILS: All zips → teeth, slider, and pull tab visible. All buttons → reproduce exact style and colour. Reproduce ALL pockets at their exact positions. Collar style reproduced exactly (standing, flat, ribbed, or shirt collar). Jacket length correctly reproduced.
SELF CHECK: Jacket type correctly identified and its specific rules applied? Material texture appropriate to the type? All pockets at correct positions? Hardware visible? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

    }, // end winter_wear subcategories

    defaultPrompt: `TASK: Virtual try-on of a Winter Wear garment.
Image 1 = Product photo. Image 2 = User photo.
Instructions: Replace the user's current outfit with the exact winter garment shown. The garment must look appropriately warm and substantial — do not slim-fit jackets or coats. Reproduce the fabric texture accurately (knit stitches, leather sheen, denim weave, quilted channels, etc.). Reproduce all structural details (zips, pockets, hardware) exactly. Keep the user's face, hair, skin tone, and background completely unchanged. No extra accessories.
Output the final image only.`,
  },


  // ─────────────────────────────────────────────
  // WATCHES
  // ─────────────────────────────────────────────
  watch: {
    label: 'Watches',
    subcategories: {}, // no sub-categories needed for watches
    defaultPrompt: `TASK: Simulate a real photograph of a customer wearing this watch on their wrist.
Image 1 = Product photo of the watch. Image 2 = Customer's wrist/hand photo.
CORE RULES:
1. PLACEMENT: Match watch case rotation and tilt to the wrist angle in Image 2. The dial must be foreshortened if the wrist is angled — match perspective exactly.
2. STRAP WRAP: The strap band MUST wrap around the wrist cylinder as a 3D object — NOT a flat overlay. Show both sides of the strap meeting the case on each side.
3. RELIGHT: Match the lighting from Image 2 — direction, harshness, and colour temperature. Apply these to the watch surface.
4. MATERIAL REALISM: Case metal → varied tones, bright specular highlight at the highest point, grain or brushing pattern visible. Crystal/glass → lens glare, slight reflection on the surface. Strap → leather grain or metal bracelet links visible.
5. CONTACT SHADOW: A subtle shadow beneath the watch case where it rests on the wrist skin.
6. PRESERVE: Everything else in Image 2 remains completely unchanged — skin, hand, background.
Output the final photorealistic image only.`,
  },

  // ─────────────────────────────────────────────
  // JEWELLERY
  // ─────────────────────────────────────────────
  jewellery: {
    label: 'Jewellery',
    subcategories: {
      ring: {
        keywords: ['ring', 'solitaire', 'engagement ring', 'cocktail ring', 'band ring', 'finger ring'],
        prompt: `TASK: Virtual try-on of a Ring on the customer's finger.
Image 1 = Product photo of the ring. Image 2 = Customer's hand photo.
RULES:
1. PLACEMENT: Place the ring on the ring finger (or the finger shown in the product photo), at the base knuckle, flush against the skin.
2. FIT: The ring band must appear to encircle the finger as a 3D band — NOT a flat image overlay.
3. SHADOW: A subtle shadow beneath the ring band where it rests on the skin.
4. MATERIAL: Metal band → match the finish (gold, silver, rose gold) with correct specular highlights. Stone (if present) → faceted surface catching light as multiple individual points, NOT a flat coloured shape.
5. SCALE: Ring size must match the finger — not too large or too small.
6. PRESERVE: The hand, skin tone, background, and all other fingers remain completely unchanged.
Output the final image only.`,
      },
      necklace: {
        keywords: ['necklace', 'pendant', 'chain necklace', 'choker', 'layered necklace', 'collar necklace'],
        prompt: `TASK: Virtual try-on of a Necklace on the customer.
Image 1 = Product photo of the necklace. Image 2 = Customer's photo.
RULES:
1. PLACEMENT: Drape the necklace along the collarbone following gravity. Pendant centered on the chest at the correct length shown in the product.
2. DRAPE: The chain must follow the curve of the neck — not floating above or sinking into the skin.
3. MATERIAL: Gold/silver chain → each link visible with individual specular highlights. Pendant stone → faceted light reflection, individual sparkle points. Kundan/gemstone → individual stones with gold foil setting visible.
4. SHADOW: Subtle shadow beneath the chain where it rests on the skin.
5. PRESERVE: Face, skin tone, clothing, and background completely unchanged.
Output the final image only.`,
      },
      earring: {
        keywords: ['earring', 'earrings', 'jhumka', 'stud earring', 'drop earring', 'hoop earring', 'chandbali'],
        prompt: `TASK: Virtual try-on of Earrings on the customer.
Image 1 = Product photo of the earrings. Image 2 = Customer's photo.
RULES:
1. PLACEMENT: Anchor earrings at the earlobe. Studs sit flush at the earlobe. Drop/dangle earrings hang straight down from the earlobe following gravity. Jhumka → the dome sits at the earlobe, the hanging bell hangs below.
2. PAIR: Both earrings must be placed — one on each ear at the same position and angle.
3. MATERIAL: Metal → specular highlight at the highest point. Gemstones → individual faceted light points. Enamel → bright solid colour, matte or satin finish.
4. SCALE: Earring size must match the product exactly relative to the earlobe.
5. PRESERVE: Face, skin tone, hair, and background completely unchanged.
Output the final image only.`,
      },
    },
    defaultPrompt: `TASK: Virtual try-on of a jewellery item on the customer.
Image 1 = Product photo of the jewellery. Image 2 = Customer's photo.
RULES: Identify the jewellery type (ring, necklace, earring, bracelet, bangle). Place it at the correct body position following gravity. The item must appear as a 3D object — NOT a flat overlay. Match the material (metal, stone, enamel) with correct light reflection and specular highlights. Individual stones must show faceted light points, never flat coloured shapes. The item must look physically real — sitting on or wrapped around the body part naturally. Keep everything else in the customer's photo completely unchanged. No extra accessories added.
Output the final image only.`,
  },

  // ─────────────────────────────────────────────
  // CASUAL / GENERAL APPAREL  (catch-all)
  // ─────────────────────────────────────────────
  casual: {
    label: 'Casual Wear',
    subcategories: {
      tshirt: {
        keywords: ['t-shirt', 'tshirt', 't shirt', 'tee', 'polo', 'graphic tee', 'crop tee'],
        prompt: `TASK: Virtual try-on of a T-shirt/Polo on the customer.
Image 1 = Product photo. Image 2 = User photo.
RULES: Replace the current shirt worn in Image 2 with the exact T-shirt shown. Wrap the crew neck or V-neck collar naturally around the base of the neck. Transfer any graphic prints, pocket details, or chest branding with flat proportional alignment — graphic must follow the chest surface curvature. Render soft natural cotton/jersey fabric folds and shadows. Retain the user's face, expression, hair, hands, arms, posture, and original background exactly.
Output the final image only.`,
      },
      shirt: {
        keywords: ['shirt', 'blouse', 'button-up', 'button-down', 'formal shirt', 'casual shirt', 'oxford shirt'],
        prompt: `TASK: Virtual try-on of a Shirt/Blouse on the customer.
Image 1 = Product photo. Image 2 = User photo.
RULES: Replace the upper garment worn in Image 2 with the exact shirt/blouse shown. Render a structured crisp collar wrapping around the neck. Fit the cuffs and sleeve lengths accurately to the user's arm posture. Render structured shoulder seams and premium fabric folds with realistic shadows. Retain the user's face, expression, hair, hands, and background without any modifications.
Output the final image only.`,
      },
      saree: {
        keywords: ['saree', 'sari', 'cotton saree', 'silk saree', 'daily wear saree', 'casual saree'],
        prompt: `TASK: Virtual try-on of a Saree on the customer.
Image 1 = Product photo. Image 2 = Full body user photo.
RULES (Nivi drape): 5-7 neat pleats at the center-front tucked into the waist at the navel — falling straight and even. Main fabric wraps from right to left at waist level. Pallu falls over the LEFT shoulder and drapes down the back. Reproduce the exact border motif continuously along the entire hem — never broken. Blouse is visible at the upper body, ending at the natural waist. Reproduce the fabric texture accurately — cotton (matte, relaxed), silk (sheen, structured), georgette (soft drape). Retain the user's face, skin tone, and background completely unchanged. No extra jewellery.
Output the final image only.`,
      },
      kurti: {
        keywords: ['kurti', 'kurta', 'anarkali', 'salwar kameez', 'tunic', 'kurtis', 'kurtas'],
        prompt: `TASK: Virtual try-on of a Kurti/Kurta on the customer.
Image 1 = Product photo. Image 2 = User photo.
RULES: Replace the current upper garment with the exact kurti/kurta shown. The neckline fits cleanly around the collar bones. Sleeves match the user's arms. Printed patterns, traditional block prints, or embroidery must be rendered with clean detail. Render the fabric with straight elegant drapes and soft vertical folds matching the user's posture. Strictly preserve the user's face, hair, lower body clothing, hands, pose, and original background exactly.
Output the final image only.`,
      },
    },
    defaultPrompt: `TASK: Virtual try-on of a casual garment.
Image 1 = Product photo. Image 2 = User photo.
Instructions: Replace the user's current outfit with the exact garment shown in the product photo. Fit it naturally to the user's body and pose. Reproduce the fabric texture, colour, and any prints or embellishments accurately. Keep the user's face, hair, skin tone, and background completely unchanged. No extra accessories.
Output the final image only.`,
  },

  // ─────────────────────────────────────────────
  // UNIVERSAL FALLBACK
  // Used when the shop has NO categories configured at all
  // ─────────────────────────────────────────────
  _fallback: `TASK: Virtual clothing try-on.
Image 1 = Product photo of the garment. Image 2 = Customer's photo.
Instructions: Show the customer wearing the exact product from Image 1. Replace their current outfit with the product. Fit the garment naturally to the customer's body, pose, and proportions. Reproduce the fabric texture, colour, silhouette, and any embellishments accurately. Keep the customer's face, hair, skin tone, and background completely unchanged. Do not add any extra jewellery, accessories, or clothing. Output the final photorealistic image only.`,

}; // end PROMPT_CONFIG


// ═══════════════════════════════════════════════════════
// DETECTION FUNCTION
// Call this at runtime to get the correct prompt.
//
// @param {string}   productTitle       - from product page
// @param {string}   productDescription - from product page
// @param {string[]} shopCategories     - main category keys from backend
//                                       e.g. ["indo_western", "party_wear"]
// @returns {string} The prompt to send to the AI
// ═══════════════════════════════════════════════════════
function detectPrompt(productTitle, productDescription, shopCategories) {
  console.log("detect prompt run here");
  // Combine title + description into one lowercase search string
  const searchText = (productTitle + ' ' + productDescription).toLowerCase();

  // If shop has no categories configured, use the universal fallback
  if (!shopCategories || shopCategories.length === 0) {
    return PROMPT_CONFIG._fallback;
  }

  // PASS 1 — try to match a sub-category keyword within any selected main category
  // (only runs for categories that HAVE sub-categories e.g. indo_western, party_wear)
  for (const mainKey of shopCategories) {
    const mainCat = PROMPT_CONFIG[mainKey];
    if (!mainCat) continue;

    const subEntries = Object.entries(mainCat.subcategories || {});
    if (subEntries.length === 0) continue; // skip no-sub-cat categories in this pass

    for (const [, subCat] of subEntries) {
      for (const keyword of subCat.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          return subCat.prompt; // ✅ Sub-category keyword match
        }
      }
    }
  }

  // PASS 2 — no sub-category keyword matched.
  // Rule: if a shop has selected a category with NO sub-categories (e.g. watch),
  // that category's defaultPrompt is ALWAYS used — regardless of product text.
  // This means: watch store selected "watch" → every product gets watch prompt.
  // Priority order: no-sub-cat categories first, then sub-cat defaults.
  for (const mainKey of shopCategories) {
    const cat = PROMPT_CONFIG[mainKey];
    if (!cat) continue;
    if (Object.keys(cat.subcategories || {}).length === 0 && cat.defaultPrompt) {
      return cat.defaultPrompt; // ✅ watch / jewellery default — always wins
    }
  }

  // PASS 3 — use the first selected main category's defaultPrompt as fallback
  for (const mainKey of shopCategories) {
    const cat = PROMPT_CONFIG[mainKey];
    if (cat && cat.defaultPrompt) return cat.defaultPrompt;
  }

  // Final universal fallback
  return PROMPT_CONFIG._fallback;
}
  console.log(" prompts.js run here");


// Make available globally (used by the Liquid script tag)
window.SBB_PROMPTS = { detectPrompt, PROMPT_CONFIG };
