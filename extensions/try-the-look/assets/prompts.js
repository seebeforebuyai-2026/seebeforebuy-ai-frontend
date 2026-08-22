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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person wearing the garment). Image 2 = Product photo (the garment to try on). Full body customer photo required.
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (must show full height). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
STEP 1 — IDENTIFY JACKET TYPE FIRST: Windbreaker (lightweight nylon, bright colours), Varsity/Baseball (wool body + leather sleeves, ribbed collar/cuffs/hem, snap buttons), Track jacket (athletic, stripe detailing on sleeves, zip-through), Utility (multiple cargo pockets, canvas/cotton, structured), Quilted shacket (between shirt and jacket weight, quilted channels), Corduroy (parallel vertical WALE RIDGES running full length), Casual zip jacket (minimal, relaxed fit, zip front).
STEP 2 — MATERIAL RULES: Windbreaker → slight nylon sheen, crinkles at armpit and elbow, vivid accurate colours. Varsity → wool body (matte, textured) CLEARLY DIFFERENT from leather sleeves (specular highlight, grain texture, flex creases) — material transition must be visible at the seam. Corduroy → WALE RIDGES visible running vertically from shoulder to hem, wider wale = more prominent ridges, colour shifts lighter at ridge peaks and darker in the valleys.
STEP 3 — ALL SHARED DETAILS: All zips → teeth, slider, and pull tab visible. All buttons → reproduce exact style and colour. Reproduce ALL pockets at their exact positions. Collar style reproduced exactly (standing, flat, ribbed, or shirt collar). Jacket length correctly reproduced.
SELF CHECK: Jacket type correctly identified and its specific rules applied? Material texture appropriate to the type? All pockets at correct positions? Hardware visible? User's face unchanged? No extra accessories?
Output the final image only.`,
      },

    }, // end winter_wear subcategories

    defaultPrompt: `TASK: Virtual try-on of a Winter Wear garment.
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
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
Image 1 = Customer wrist/hand photo (the person). Image 2 = Product photo of the watch.
CORE RULES:
1. PLACEMENT: Match watch case rotation and tilt to the wrist angle in Image 1. The dial must be foreshortened if the wrist is angled — match perspective exactly.
2. STRAP WRAP: The strap band MUST wrap around the wrist cylinder as a 3D object — NOT a flat overlay. Show both sides of the strap meeting the case on each side.
3. RELIGHT: Match the lighting from Image 1 — direction, harshness, and colour temperature. Apply these to the watch surface.
4. MATERIAL REALISM: Case metal → varied tones, bright specular highlight at the highest point, grain or brushing pattern visible. Crystal/glass → lens glare, slight reflection on the surface. Strap → leather grain or metal bracelet links visible.
5. CONTACT SHADOW: A subtle shadow beneath the watch case where it rests on the wrist skin.
6. PRESERVE: Everything else in Image 1 remains completely unchanged — skin, hand, background.
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
Image 1 = Customer hand photo (the person). Image 2 = Product photo of the ring to try on.
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
Image 1 = Customer photo (the person). Image 2 = Product photo of the necklace to try on.
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
Image 1 = Customer photo (the person). Image 2 = Product photo of the earrings to try on.
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
Image 1 = Customer photo (the person). Image 2 = Product photo of the jewellery to try on.
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
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
RULES: Replace the current shirt worn in Image 1 with the exact T-shirt shown. Wrap the crew neck or V-neck collar naturally around the base of the neck. Transfer any graphic prints, pocket details, or chest branding with flat proportional alignment — graphic must follow the chest surface curvature. Render soft natural cotton/jersey fabric folds and shadows. Retain the user's face, expression, hair, hands, arms, posture, and original background exactly.
Output the final image only.`,
      },
      shirt: {
        keywords: ['shirt', 'blouse', 'button-up', 'button-down', 'formal shirt', 'casual shirt', 'oxford shirt'],
        prompt: `TASK: Virtual try-on of a Shirt/Blouse on the customer.
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
RULES: Replace the upper garment worn in Image 1 with the exact shirt/blouse shown. Render a structured crisp collar wrapping around the neck. Fit the cuffs and sleeve lengths accurately to the user's arm posture. Render structured shoulder seams and premium fabric folds with realistic shadows. Retain the user's face, expression, hair, hands, and background without any modifications.
Output the final image only.`,
      },
      saree: {
        keywords: ['saree', 'sari', 'cotton saree', 'silk saree', 'daily wear saree', 'casual saree'],
        prompt: `TASK: Virtual try-on of a Saree on the customer.
Image 1 = Customer photo � full body (the person). Image 2 = Product photo (the garment to try on).
RULES (Nivi drape): 5-7 neat pleats at the center-front tucked into the waist at the navel — falling straight and even. Main fabric wraps from right to left at waist level. Pallu falls over the LEFT shoulder and drapes down the back. Reproduce the exact border motif continuously along the entire hem — never broken. Blouse is visible at the upper body, ending at the natural waist. Reproduce the fabric texture accurately — cotton (matte, relaxed), silk (sheen, structured), georgette (soft drape). Retain the user's face, skin tone, and background completely unchanged. No extra jewellery.
Output the final image only.`,
      },
      kurti: {
        keywords: ['kurti', 'kurta', 'anarkali', 'salwar kameez', 'tunic', 'kurtis', 'kurtas'],
        prompt: `TASK: Virtual try-on of a Kurti/Kurta on the customer.
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
RULES: Replace the current upper garment with the exact kurti/kurta shown. The neckline fits cleanly around the collar bones. Sleeves match the user's arms. Printed patterns, traditional block prints, or embroidery must be rendered with clean detail. Render the fabric with straight elegant drapes and soft vertical folds matching the user's posture. Strictly preserve the user's face, hair, lower body clothing, hands, pose, and original background exactly.
Output the final image only.`,
      },
    },
    defaultPrompt: `TASK: Virtual try-on of a casual garment.
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
Instructions: Replace the user's current outfit with the exact garment shown in the product photo. Fit it naturally to the user's body and pose. Reproduce the fabric texture, colour, and any prints or embellishments accurately. Keep the user's face, hair, skin tone, and background completely unchanged. No extra accessories.
Output the final image only.`,
  },


   activewear: {
  label: 'Activewear & Gym Wear',
  subcategories: {

    compression_wear: {
      keywords: [
        'compression wear', 'compression tights', 'compression leggings',
        'gym tights', 'running tights', 'skin tight leggings',
        'performance tights', 'compression pants',
      ],
      prompt: `TASK: Virtual try-on of Compression Wear (Tights / Compression Leggings).
Image 1: Customer photo (the person). Image 2: Product photo of Compression Wear (skin-tight compression leggings/tights).
(see Image 1 = customer above)
Goal: Show the user wearing these exact compression tights naturally.

STEP 1 — IDENTIFY THE PRODUCT:
- Waistband height: high-waist (above navel) or mid-waist (at navel)
- Colour: solid, colour-block, or with printed pattern
- Panels: mesh inserts (sheer panels), colour-block sections, or reflective strips
- Pocket: waistband phone pocket (typically at back or side) — if present
- Waistband width: wide waistband (5-8cm) or regular waistband (3-4cm)

STEP 2 — BODY-CONTOURING FIT (MOST CRITICAL):
- Compression wear is SKIN TIGHT — it contours every surface of the body
- The fabric must follow the user's leg muscles precisely:
  Quadriceps at the front: fabric follows muscle outline
  Hamstrings at the back: fabric wraps behind the leg
  Calves: fabric narrows following calf taper
- NO loose fabric, NO fabric bunching, NO gaps between fabric and skin
- Leggings must look like a second skin — not a garment placed over the leg
- User's natural body shape shows THROUGH the compression fabric

STEP 3 — WAISTBAND PLACEMENT:
- High-waist: rises above navel — sits at lower ribcage. Wide (5-8cm) and flat against abdomen. No rolling down or gaping.
- Mid-waist: sits at navel exactly
- Waistband colour or design must match product exactly
- Phone pocket at back: show pocket outline as rectangular raised section

STEP 4 — COMPRESSION PANEL DETAILS:
- Colour-block panels: reproduce EXACTLY where each colour appears. Follow leg shape (curve with leg).
- Mesh inserts: mesh panels are SHEER — skin beneath is visible. Show diamond/hexagonal pattern.
- Reflective strips: bright linear highlights that catch light at side seam or back calf.

STEP 5 — COMPRESSION FABRIC TEXTURE:
- Lycra/spandex fabric has a subtle sheen — reflective on raised muscle surfaces.
- Shadow between muscles — compression fabric makes anatomy more visible.
- At knee: fabric slightly compresses and shows knee shape.
- At ankle: narrows with ankle — no excess fabric.

STEP 6 — FLATLOCK SEAMS:
- Flatlock seams lie flat on surface as slightly raised lines.
- Side seam: runs down outer leg from waist to ankle.
- Do NOT render seams as thick raised ridges — keep them flat and subtle.

STEP 7 — LIGHTING:
- Strong highlight on quadriceps closest to light. Shadow on inner thigh and back leg.
- Mesh inserts: light passes through showing skin beneath.

SELF CHECK:
[ ] Is the fabric skin-tight contouring every muscle without gaps?
[ ] Is waistband at correct height and lying flat?
[ ] Are colour-block panels at exact correct positions?
[ ] Is mesh shown as sheer with skin visible?
[ ] Subtle fabric sheen present?
[ ] Tapered correctly at ankle?
[ ] User's face and body shape unchanged?
Output the final image only.`,
    },

    tank_top: {
      keywords: [
        'tank top', 'athletic tank top', 'racerback tank', 'muscle tank',
        'gym tank top', 'sleeveless gym top', 'workout tank', 'running tank',
      ],
      prompt: `TASK: Virtual try-on of an Athletic Tank Top.
Image 1: Customer photo (the person). Image 2: Product photo of an Athletic Tank Top.
(see Image 1 = customer above)
Goal: Show the user wearing this exact tank top naturally.

STEP 1 — IDENTIFY THE TANK TOP STYLE:
- Strap style: racerback (converge at back into V shape), regular shoulder straps, spaghetti straps, or muscle tank (wide armhole).
- Fit: fitted, regular, or loose/boxy.
- Neckline: scoop neck, V-neck, crew neck, or high neck.
- Length: regular (ends at hip) or cropped (ends above waist).

STEP 2 — STRAP PLACEMENT:
- Racerback: straps come from front shoulders and converge at CENTER BACK into a single point/band. Large armhole exposing shoulder area.
- Regular straps: two equal-width straps sit flat on shoulders.
- Muscle tank (men's): wide armhole exposing side torso from armpit to hip. Minimal shoulder coverage.

STEP 3 — FABRIC FIT:
- Fitted/compression: hugs torso following body shape.
- Regular fit: slight ease from shoulders — not skin-tight.
- Loose/boxy: excess fabric at sides and body, straight hem.

STEP 4 — MOISTURE-WICKING FABRIC TEXTURE:
- Athletic polyester/nylon: slight sheen, thin and lightweight texture.
- Smooth even surface texture.

STEP 5 — GRAPHIC AND MESH DETAILS:
- Reproduce graphic/logo EXACTLY on chest/back, following body curvature.
- Mesh panels: show as sheer with skin beneath subtly visible.

STEP 6 — LIGHTING: Soft to moderate sheen. Highlight on chest and shoulder closest to light.

SELF CHECK:
[ ] Strap style correctly reproduced (racerback converging at back, regular, muscle)?
[ ] Neckline style and depth accurate?
[ ] Fit appropriate (fitted, regular, loose)?
[ ] Graphic/print exactly reproduced?
[ ] Mesh panels sheer with skin visible?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    half_sleeve_tshirt: {
      keywords: [
        'half sleeve t-shirt', 'athletic t-shirt', 'gym tshirt',
        'dry fit tshirt', 'running tshirt', 'performance tshirt',
        'raglan tshirt', 'drop shoulder gym tshirt',
      ],
      prompt: `TASK: Virtual try-on of an Athletic Half Sleeve T-Shirt.
Image 1: Customer photo (the person). Image 2: Product photo of an Athletic Half Sleeve T-Shirt.
(see Image 1 = customer above)
Goal: Show the user wearing this exact athletic t-shirt naturally.

STEP 1 — IDENTIFY THE T-SHIRT:
- Sleeve style: standard set-in sleeve, raglan sleeve (diagonal seam from collar to underarm), or drop shoulder (seam sits below shoulder).
- Fit: slim/compression, regular, or oversized.
- Neckline: crew neck or V-neck.

STEP 2 — SLEEVE PLACEMENT:
- Standard set-in: seam at shoulder edge, sleeve falls to mid-bicep.
- Raglan sleeve: NO shoulder seam. Diagonal seam runs from underarm to collar on both front/back. Reproduce sleeve/body colour split if present.
- Drop shoulder: sleeve seam falls BELOW natural shoulder onto upper arm.

STEP 3 — FABRIC SPECIFICS:
- Performance polyester (dry-fit): lightweight, micro-mesh/interlock subtle texture, dry-fit sheen.
- Cotton blend athletic: heavier, matte finish, softer drape.

STEP 4 — GRAPHIC AND FIT RULES:
- Graphics/sublimation prints must wrap and curve naturally over chest/shoulders.
- Slim/compression fit: close to body showing muscle definition.
- Regular fit: comfortable ease through torso.
- Oversized fit: intentionally loose with extra fabric volume.

SELF CHECK:
[ ] Sleeve style correctly reproduced (set-in, raglan diagonal seam, drop shoulder)?
[ ] Sleeve length accurate?
[ ] Graphic/print exactly reproduced following fabric surface?
[ ] Fit matches style (slim, regular, oversized)?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    regular_gym_lower: {
      keywords: [
        'regular gym lower', 'track pant', 'fitted track pant',
        'gym lower', 'athletic pants', 'slim fit track pant', 'sports lower',
      ],
      prompt: `TASK: Virtual try-on of a Regular Gym Lower / Track Pant.
Image 1: Customer photo (the person). Image 2: Product photo of Regular Gym Lower / Track Pant.
(see Image 1 = customer above)
Goal: Show user wearing these exact gym track pants naturally.

STEP 1 — IDENTIFY THE LOWER:
- Leg fit: slim/tapered (narrows from hip to ankle) or straight.
- Ankle style: ribbed ankle cuff or open hem.
- Waistband: wide elastic with drawstring (external/internal).
- Side detail: single/double side stripe or plain.

STEP 2 — WAISTBAND & DRAWSTRING:
- Elastic waistband sits flat at natural waist (4-6cm width).
- External drawstring exits from two front center holes, cords hanging down naturally with visible aglets/tips.

STEP 3 — LEG FIT & SIDE STRIPES:
- Slim/tapered: follows leg shape, narrows progressively to ankle. No excess bunching.
- Side stripes: reproduce EXACT width, count, and colour. Stripes curve with outer leg profile.

STEP 4 — ANKLE CUFF & FABRIC:
- Ribbed cuff: rib-knit band gathers pant fabric neatly at ankle with vertical rib lines visible.
- Polyester/nylon: lightweight structure with soft athletic sheen.

SELF CHECK:
[ ] Waistband flat with drawstring hanging naturally?
[ ] Leg taper/fit correct for style?
[ ] Side stripes exact width and colour following outer leg?
[ ] Ankle cuff showing rib texture and fabric gathers?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    baggy_lower: {
      keywords: [
        'baggy lower', 'parachute pant', 'parachute lower',
        'oversized track pant', 'baggy gym pant', 'wide leg track pant',
        'cargo track pant', 'streetwear lower',
      ],
      prompt: `TASK: Virtual try-on of a Baggy Lower / Parachute Pant.
Image 1: Customer photo (the person). Image 2: Product photo of Baggy Lower or Parachute Pant.
(see Image 1 = customer above)
Goal: Show user wearing these exact baggy/parachute pants naturally.

STEP 1 — IDENTIFY TYPE & TEXTURE:
- Parachute Pant: crinkly, lightweight nylon shell, parachutelike drape, subtle nylon sheen, irregular crinkle fold pattern across surface.
- Baggy Cotton/Fleece: heavier weight, matte surface, relaxed streetwear drape.

STEP 2 — VOLUME & DRAPE (CRITICAL):
- INTENTIONALLY EXTREMELY WIDE and voluminous. Do NOT slim down to fit legs.
- Excess fabric falls in large, soft folds from hip to ankle.
- Fabric drapes away from thigh on both sides. Fabric gathers/stacks at ankle over footwear if long.

STEP 3 — WAISTBAND & CARGO POCKETS:
- Elastic waistband with hanging drawstring/toggle cord lock.
- Cargo pockets on thigh: reproduce pocket flaps, closures (snaps/velcro), and 3D pocket volume on both legs accurately.

SELF CHECK:
[ ] Leg VERY wide and voluminous — NOT slimmed down?
[ ] Parachute fabric shows crinkle lines and nylon sheen?
[ ] Cargo pockets reproduced with 3D depth and flaps?
[ ] Fabric drapes in large loose folds?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    sports_bra: {
      keywords: [
        'sports bra', 'padded sports bra', 'racerback sports bra',
        'high impact sports bra', 'workout bra', 'gym bra',
        'strappy sports bra', 'cross back sports bra',
      ],
      prompt: `TASK: Virtual try-on of a Sports Bra.
Image 1: Customer photo (the person). Image 2: Product photo of a Sports Bra.
(see Image 1 = customer above)
Goal: Show the user wearing this exact sports bra naturally.

STEP 1 — IDENTIFY STYLE & BACK DETAIL:
- Back style: racerback, cross-back (X pattern), T-back, strappy (multiple geometric straps), or regular parallel straps.
- Impact level: low, medium, or high impact (firm compression, wide band).
- Front: plain, zippered (front zip), or cutout detail.

STEP 2 — PLACEMENT & COMPRESSION:
- Underband sits FLAT and snug against lower chest at underbust level — no gaping/floating.
- Straps sit securely on shoulders.
- Compression fit: fabric hugs chest with zero gaps.

STEP 3 — BACK STYLE REPRODUCTION (CRITICAL):
- Racerback: straps converge to center back band exposing shoulder blades.
- Cross-back: straps cross in clear X pattern at center back.
- Strappy back: reproduce EVERY strap at exact position creating negative skin space between straps.

STEP 4 — FABRIC & LIGHTING:
- Technical spandex/nylon: soft sheen, smooth finish.
- Mesh panels: sheer texture showing skin beneath.

SELF CHECK:
[ ] Bra sitting flat against chest and underbust?
[ ] Back style (racerback, cross-back, strappy) EXACTLY reproduced?
[ ] Compression visible — tight fit without gaps?
[ ] Mesh panels sheer with skin visible?
[ ] User's face, skin tone, and body unchanged?
Output the final image only.`,
    },

    jogger_pants: {
      keywords: [
        'jogger pants', 'gym joggers', 'tapered joggers',
        'fleece joggers', 'cotton joggers', 'athletic joggers',
        'sweatpants', 'slim joggers',
      ],
      prompt: `TASK: Virtual try-on of Jogger Pants.
Image 1: Customer photo (the person). Image 2: Product photo of Jogger Pants.
(see Image 1 = customer above)
Goal: Show user wearing these exact jogger pants naturally.

STEP 1 — SILHOUETTE & TAPER (CRITICAL):
- Relaxed/ease through hip and thigh -> progressively narrows down leg -> ends in snug ribbed/elastic cuff at ankle.
- Smooth transition from wider thigh to narrow tapered lower leg.

STEP 2 — RIBBED ANKLE CUFF:
- 5-10cm tall rib-knit band hugging ankle.
- Alternating raised/recessed vertical rib texture clearly visible.
- Pant leg fabric GATHERS slightly into top of cuff (small fabric gathers visible above cuff).

STEP 3 — WAISTBAND & POCKETS:
- Wide elastic waistband (5-7cm) with drawstring hanging at front center.
- Side slash pockets or zipped pockets accurately positioned at hip.

STEP 4 — FABRIC:
- Fleece/cotton: matte, warm weight, slightly fuzzy edge texture.
- Polyester athletic: smooth, lightweight, subtle sheen.

SELF CHECK:
[ ] Silhouette correct: relaxed thigh tapering down to tight cuff?
[ ] Ribbed ankle cuff showing vertical texture and fabric gathers above?
[ ] Front drawstring hanging naturally?
[ ] Fabric texture accurate to material?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    gym_shorts: {
      keywords: [
        'gym shorts', 'athletic shorts', 'running shorts',
        '2-in-1 shorts', 'workout shorts', 'men gym shorts',
        'women gym shorts', 'mesh gym shorts',
      ],
      prompt: `TASK: Virtual try-on of Gym Shorts / Athletic Shorts.
Image 1: Customer photo (the person). Image 2: Product photo of Gym Shorts.
(see Image 1 = customer above)
Goal: Show user wearing these exact athletic shorts naturally.

STEP 1 — IDENTIFY TYPE & LENGTH:
- Type: compression (tight), regular/loose, or 2-in-1 (compression liner under loose shell).
- Length: upper thigh (2-3 in), mid-thigh (5-7 in), or knee-length (9+ in).
- Details: side slits, elastic waistband with drawstring, side pockets.

STEP 2 — FIT & LAYERING:
- Compression shorts: skin-tight contouring thigh muscles completely.
- Regular shorts: loose/relaxed drape with clearance around leg.
- 2-in-1 shorts: inner compression layer is tight against thigh and extends slightly below loose outer shell hem. Both layers clearly visible.

STEP 3 — DETAILS:
- Side slits: slit opens at outer hem showing bare leg or inner liner in motion.
- Waistband: flat elastic with hanging drawstring.

SELF CHECK:
[ ] Length matches product precisely on user's thigh?
[ ] Fit correct (tight compression vs loose outer shell)?
[ ] For 2-in-1: inner tight layer and outer loose shell both visible?
[ ] Side slits shown as openings at hem if present?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    cycling_shorts: {
      keywords: [
        'cycling shorts', 'biker shorts', 'mid thigh compression shorts',
        'gym biker shorts', 'high waist biker shorts', 'women biker shorts',
      ],
      prompt: `TASK: Virtual try-on of Cycling Shorts / Biker Shorts.
Image 1: Customer photo (the person). Image 2: Product photo of Cycling / Biker Shorts.
(see Image 1 = customer above)
Goal: Show user wearing these exact biker shorts naturally.

STEP 1 — IDENTIFY & PLACEMENT:
- Length: MID-THIGH endpoint (ends between upper thigh and knee — NOT at knee).
- Waistband: high-waist (sits flat above navel, 6-10cm wide band).

STEP 2 — COMPRESSION FIT:
- Skin-tight compression fit from waist to hem band — zero gaps or bunching.
- Hem band lies completely flat against skin at mid-thigh (no digging in or rolling up).
- Outlines natural thigh contours.

STEP 3 — DETAILS & FABRIC:
- Lycra/spandex blend: smooth surface with soft athletic sheen.
- Reproduce side panels, waistband logos, or phone pockets accurately if present.

SELF CHECK:
[ ] Endpoint is strictly MID-THIGH?
[ ] High waistband is flat and above navel without rolling?
[ ] Fabric skin-tight to hem band?
[ ] User's face, skin tone, and body unchanged?
Output the final image only.`,
    },

    tracksuit_set: {
      keywords: [
        'tracksuit', 'co-ord set', 'gym co-ord set', 'matching tracksuit',
        'athletic set', 'tracksuit set', 'hoodie track set', 'sweat suit',
      ],
      prompt: `TASK: Virtual try-on of an Athletic Tracksuit / Co-ord Set.
Image 1: Customer photo (the person). Image 2: Product photo of Tracksuit or Co-ord Set (matching top + bottom).
(see Image 1 = customer above)
Goal: Show user wearing both top and bottom matching set together.

STEP 1 — MATCHING REQUIREMENT (CRITICAL):
- Top and bottom MUST match perfectly in colour, pattern, fabric weight, and sheen.
- Stripes/panels: stripe width, colour, and accent details must be identical on both top and bottom.

STEP 2 — PIECE FIT & TRANSITION:
- Top (jacket/sweatshirt/hoodie): lightweight athletic fit or relaxed fit.
- Bottom (track pants/joggers): apply jogger/track pant fit rules.
- Transition: waistband of bottom visible where top hem meets it naturally.

STEP 3 — UNIFIED LIGHTING:
- Identical light direction, highlight intensity, and shadow rendering across BOTH top and bottom pieces.

SELF CHECK:
[ ] Top and bottom perfectly matched in colour and fabric sheen?
[ ] Lighting completely consistent across entire outfit?
[ ] Both pieces fully visible from shoulder to ankle?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    zip_up_gym_jacket: {
      keywords: [
        'zip up gym jacket', 'windcheater', 'gym jacket', 'running jacket',
        'athletic jacket', 'lightweight gym jacket', 'softshell gym jacket',
      ],
      prompt: `TASK: Virtual try-on of a Zip-Up Gym Jacket / Windcheater.
Image 1: Customer photo (the person). Image 2: Product photo of Zip-Up Gym Jacket / Windcheater.
(see Image 1 = customer above)
Goal: Show user wearing this exact gym jacket naturally.

STEP 1 — IDENTIFY:
- Style: slim athletic cut, stand collar or funnel neck.
- Features: full-length front zipper, zippered hand pockets, thumb holes at cuffs, reflective accents.

STEP 2 — LIGHTWEIGHT APPEARANCE:
- Garment is THIN performance fabric — NOT bulky, padded, or puffy like a winter coat.
- Drapes close to body with light athletic ease.

STEP 3 — THUMB HOLES (KEY DETAIL):
- If product features thumb holes: show user's thumb protruding through cuff opening, fabric gathering slightly at wrist.

STEP 4 — FABRIC & LIGHTING:
- Polyester/nylon windcheater: smooth, light directional sheen, subtle ripstop grid pattern if present in product photo.
- Full zip visible down center front with pull tab. Reflective elements catch bright highlights.

SELF CHECK:
[ ] Jacket looks THIN and lightweight (not puffy)?
[ ] Full zipper visible from hem to collar?
[ ] Thumb holes shown with thumbs protruding if featured in product?
[ ] Reflective strips/logos highlighted?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

    sports_leggings: {
      keywords: [
        'sports leggings', 'full length leggings', 'gym leggings with pockets',
        'mid compression leggings', 'high waist sports leggings',
      ],
      prompt: `TASK: Virtual try-on of Sports Leggings (Full Length, Mid-Compression).
Image 1: Customer photo (the person). Image 2: Product photo of Sports Leggings.
(see Image 1 = customer above)
Goal: Show user wearing these exact sports leggings naturally.

STEP 1 — FIT LEVEL (MID-COMPRESSION):
- Fitted and close to body, but NOT as extreme skin-tight as performance compression tights.
- Fabric defines leg shape with subtle natural ease/small fold at knee when standing.

STEP 2 — SIDE POCKETS (KEY FEATURE):
- Side pocket panels sewn into outer thigh seam.
- Show clear panel outline/seam for pocket. If phone present, show subtle rectangular bulge through fabric.

STEP 3 — WAISTBAND & PRINT:
- High waistband (6-8cm) sitting flat above navel.
- Printed patterns wrap and curve around muscle surfaces accurately.
- Mesh panels at calf or back-knee rendered as sheer with skin tone visible.

SELF CHECK:
[ ] Fit is close-fitting with mid-compression (slight natural ease)?
[ ] Side pockets clearly rendered as distinct panels on outer thigh?
[ ] Waistband high and lying flat?
[ ] Printed pattern wrapping leg curvature properly?
[ ] User's face and body unchanged?
Output the final image only.`,
    },

  }, // end activewear subcategories

  defaultPrompt: `TASK: Virtual try-on of Activewear / Gym Wear garment.
Image 1 = Customer photo (the person). Image 2 = Product photo (the garment to try on).
Instructions: Replace the user's current outfit with the exact athletic activewear garment shown. Ensure proper body-contouring fit, correct technical details (flatlock seams, mesh panels, drawstrings, cuffed hems, zippers, thumb holes), and accurate fabric sheen. Fit the garment naturally to the user's body and pose. Keep the user's face, hair, skin tone, and background completely unchanged. No extra accessories or jewellery.
Output the final image only.`,
},


headwear_caps: {
  label: 'Headwear & Caps',
  subcategories: {

    baseball_dad_cap: {
      keywords: [
        'baseball cap', 'dad cap', 'curved brim cap', 'curved visor cap',
        'unstructured cap', '6 panel cap', 'cotton twill cap', 'adjustable cap',
      ],
      prompt: `TASK:
Image 1: Customer photo (the person). Image 2: Product photo of a Baseball Cap / Dad Cap (curved brim cap)
-- (user photo is Image 1, product is Image 2)
Goal: Show the user wearing this exact curved brim cap naturally on their head.

══════════════════════════════════════════
ABSOLUTE PRIORITY RULES — APPLY BEFORE ANYTHING ELSE
══════════════════════════════════════════

RULE 1 — FACE IS COMPLETELY UNTOUCHABLE:
- The user's face in the output must be a pixel-perfect copy of Image 1.
- Same skin tone, facial features, facial hair (beard/stubble), expression, eye colour, and skin texture.
- Do NOT relight, smooth, brighten, or alter the face in any way.
- Treat the face like a locked layer that cannot be touched.

RULE 2 — EMBROIDERY, LOGO, AND BRAND DETAILS MUST BE EXACT:
- Front panel embroidery MUST appear raised and 3D with visible thread texture and subtle thread shadows.
- Correct logo size, exact position, accurate thread colours, and crisp lettering.
- Flat prints or patches must lie flat on the front fabric surface — no floating logos.

RULE 3 — CAP MUST SIT ON THE HEAD, NOT FLOAT:
- The cap physically conforms to the user's skull with zero gap.
- The cap compresses the hair beneath it slightly.

══════════════════════════════════════════
STEP 1 — CAP TYPE & CROWN STRUCTURE
══════════════════════════════════════════
- BASEBALL CAP: Stiff, structured 6-panel crown that holds its shape firmly.
- DAD CAP: Soft, unstructured crown that sags and creases naturally at the top.
- 6-panel seam lines run from the brim edge to the fabric-covered top button at the crown peak.
- Reproduce the top button at the crown peak precisely.

══════════════════════════════════════════
STEP 2 — BRIM CURVE & FOREHEAD SHADOW
══════════════════════════════════════════
- The brim curves DOWNWARD from the front center — reproduce the exact arc curve radius from Image 2.
- The brim sits 2-3 fingers above the eyebrows, curving gently across the forehead profile.
- CRITICAL: The brim MUST cast a natural curved shadow onto the user's forehead and upper face, matching Image 1 lighting direction.
- Show the underside of the brim (green, grey, or matching fabric) facing downward toward the forehead.

══════════════════════════════════════════
STEP 3 — HEAD GEOMETRY & HAIR INTERACTION
══════════════════════════════════════════
- Cap matches user's head angle and tilt from Image 2.
- Top hair is compressed under the cap crown.
- Hair below the cap band flows naturally at the sides and back. If a ponytail is present, show it exiting through the back loop opening above the strap.
- Back closure: Reproduce strapback (metal buckle/fabric strap) or Velcro closure naturally at the rear.

══════════════════════════════════════════
STEP 4 — FABRIC TEXTURE & LIGHTING
══════════════════════════════════════════
- Cotton twill texture: Subtle diagonal weave pattern with matte surface finish.
- Cap lighting matches Image 1 dominant light direction exactly.
- Highlights on top crown, soft shadows in panel seam lines.

══════════════════════════════════════════
STEP 5 — MANDATORY SELF CHECK
══════════════════════════════════════════
[ ] Face identical to Image 1 (features, skin tone, beard, expression untouched)?
[ ] Cap sitting directly ON the skull conforming to its curvature?
[ ] Brim curves correctly and casts a curved shadow across the forehead?
[ ] Front panel embroidery rendered with raised 3D thread texture?
[ ] Crown structure accurate (stiff structured for baseball vs soft creased for dad cap)?
[ ] Hair compressed under band, natural at sides/back, ponytail exiting back loop if present?
[ ] Top button and 6-panel seams visible?

Output the final image only.`,
    },

    snapback_cap: {
      keywords: [
        'snapback cap', 'snapback', 'flat brim cap', 'flat visor cap',
        'streetwear cap', '5 panel cap', 'fitted cap', 'flat bill cap',
      ],
      prompt: `TASK:
Image 1: Customer photo (the person). Image 2: Product photo of a Snapback Cap (flat brim structured cap)
-- (user photo is Image 1, product is Image 2)
Goal: Show the user wearing this exact snapback cap naturally on their head.

══════════════════════════════════════════
ABSOLUTE PRIORITY RULES — APPLY BEFORE ANYTHING ELSE
══════════════════════════════════════════

RULE 1 — FACE IS COMPLETELY UNTOUCHABLE:
- The user's face in the output must be a pixel-perfect copy of Image 1.
- Same skin tone, facial features, facial hair, expression, eye colour, and skin texture.
- Do NOT relight, smooth, brighten, or alter the face in any way.

RULE 2 — FLAT BRIM RULE (NON-NEGOTIABLE):
- The brim is COMPLETELY FLAT with ZERO downward curve.
- Geometrically straight brim extending straight forward parallel to the ground.
- If stickers (hologram or brand stickers) are present on the brim in Image 2, reproduce them EXACTLY on the flat brim surface.

RULE 3 — EMBROIDERY & BRAND DETAILS:
- Front embroidery MUST be high-density, heavily raised 3D thread with tactile depth and sharp edge shadows.
- Exact logo size, placement, design, and thread colours.

══════════════════════════════════════════
STEP 1 — CROWN STRUCTURE & BACK CLOSURE
══════════════════════════════════════════
- High-profile, stiff, rigid structured crown that maintains its tall shape without collapsing.
- Top button present at peak; panel seams running cleanly down the crown.
- Plastic snapback closure at the rear: Overlapping plastic strips with visible adjustment holes.

══════════════════════════════════════════
STEP 2 — PLACEMENT & STRAIGHT FOREHEAD SHADOW
══════════════════════════════════════════
- Sits firm and level on the skull, 2-3 fingers above eyebrows.
- CRITICAL: The flat brim casts a straight-edged shadow horizontally across the user's forehead.
- Shadow direction matches the dominant light source in Image 1.

══════════════════════════════════════════
STEP 3 — HAIR INTERACTION & FABRIC TEXTURE
══════════════════════════════════════════
- Hair is compressed under the rigid cap crown. Lower hair emerges naturally at sides and back.
- Wool-blend or thick twill texture: Matte finish with firm, structured panels.

══════════════════════════════════════════
STEP 4 — MANDATORY SELF CHECK
══════════════════════════════════════════
[ ] Face completely identical to Image 1?
[ ] Brim is 100% FLAT with zero downward curve?
[ ] Straight horizontal shadow cast beneath flat brim onto forehead?
[ ] Hologram/brand brim stickers reproduced if present in Image 2?
[ ] Front artwork rendered as raised 3D thread embroidery?
[ ] High-profile structured crown firm and tall?
[ ] Plastic snap adjustment visible at the back?

Output the final image only.`,
    },

    trucker_cap: {
      keywords: [
        'trucker cap', 'mesh cap', 'foam trucker hat', 'mesh back cap',
        'trucker hat', 'snapback trucker', 'mesh snapback',
      ],
      prompt: `TASK:
Image 1: Customer photo (the person). Image 2: Product photo of a Trucker Cap (foam front with mesh back)
-- (user photo is Image 1, product is Image 2)
Goal: Show the user wearing this exact trucker cap naturally on their head.

══════════════════════════════════════════
ABSOLUTE PRIORITY RULES — APPLY BEFORE ANYTHING ELSE
══════════════════════════════════════════

RULE 1 — FACE IS COMPLETELY UNTOUCHABLE:
- The user's face in the output must be a pixel-perfect copy of Image 1.
- Same skin tone, facial features, facial hair, expression, eye colour, and skin texture.
- Zero face modification, smoothing, or relighting.

RULE 2 — MESH TRANSPARENCY (NON-NEGOTIABLE):
- Back and side panels are SHEER MESH with a visible open grid or diamond pattern.
- User's hair colour and scalp MUST be visible through the mesh panels from behind and sides.
- Mesh panels are semi-transparent fabric, NOT solid opaque material.

RULE 3 — FRONT FOAM & LOGO ACCURACY:
- Front panel is a stiff structured FOAM panel holding a smooth, high-profile shape.
- Screen print, woven patch, or embroidery on front foam reproduced with exact precision, crisp borders, and correct scale.

══════════════════════════════════════════
STEP 1 — DUAL MATERIAL CONSTRUCTION
══════════════════════════════════════════
- Front section: Thick, smooth foam panel.
- Back section: Sheer open-grid mesh fabric.
- Clear, distinct seam join where the stiff foam front meets the sheer mesh side panels.

══════════════════════════════════════════
STEP 2 — BRIM, PLACEMENT & SHADOW
══════════════════════════════════════════
- Curved or flat brim matching Image 2 exactly.
- Cap sits firmly on the head following skull curvature.
- Brim casts a natural shadow onto the user's forehead matching Image 1 light direction.
- Rear adjustment: Plastic snapback closure visible at the back.

══════════════════════════════════════════
STEP 3 — HAIR INTERACTION
══════════════════════════════════════════
- Hair under the foam front is covered.
- Hair under the mesh panels is clearly visible through the open mesh grid.
- Hair below the cap band flows out naturally at side/neck.

══════════════════════════════════════════
STEP 4 — MANDATORY SELF CHECK
══════════════════════════════════════════
[ ] Face 100% identical to Image 1?
[ ] Back/side mesh panels sheer with user's hair/scalp visible through the grid?
[ ] Front foam panel structured, smooth, and holding high-profile shape?
[ ] Distinct seam line visible between front foam and rear mesh?
[ ] Front artwork/patch reproduced with exact details and placement?
[ ] Brim shadow cast on user's forehead?
[ ] Rear plastic snap closure visible?

Output the final image only.`,
    },

    bucket_hat: {
      keywords: [
        'bucket hat', 'fisherman hat', 'soft brim hat', 'sun bucket hat',
        'canvas bucket hat', 'streetwear bucket hat', 'denim bucket hat',
      ],
      prompt: `TASK:
Image 1: Customer photo (the person). Image 2: Product photo of a Bucket Hat (soft sloped brim hat)
-- (user photo is Image 1, product is Image 2)
Goal: Show the user wearing this exact bucket hat naturally on their head.

══════════════════════════════════════════
ABSOLUTE PRIORITY RULES — APPLY BEFORE ANYTHING ELSE
══════════════════════════════════════════

RULE 1 — FACE IS COMPLETELY UNTOUCHABLE:
- The user's face in the output must be a pixel-perfect copy of Image 1.
- Same skin tone, facial features, facial hair, expression, and skin texture.
- Do NOT alter, smooth, or relight the face.

RULE 2 — 360-DEGREE DROOPING BRIM RULE:
- Soft, flexible brim droops downward all the way around the head (front, sides, and back).
- No rigid stiffness — the brim displays a soft, natural fabric wave along its circumference.
- The brim angle matches Image 1 exactly.

RULE 3 — LOGO & BRAND DETAILS:
- Front center logo, embroidered motif, or woven label patch reproduced with exact size, position, and thread detail.

══════════════════════════════════════════
STEP 1 — CROWN STRUCTURE & HEAD PLACEMENT
══════════════════════════════════════════
- Unstructured, soft cylindrical crown that fits over the top of the skull.
- Crown conforms softly to the head shape without rigid paneling.
- Sits comfortably on the skull, compressing top hair downwards.

══════════════════════════════════════════
STEP 2 — HAIR INTERACTION & SHADOW
══════════════════════════════════════════
- Hair on top of head is completely covered under crown.
- Hair at sides, back, and temples flows out naturally from under the perimeter drooping brim.
- CRITICAL: The 360-degree brim casts a soft circular shadow over the upper forehead, eyes, and temple area, consistent with Image 1 lighting.

══════════════════════════════════════════
STEP 3 — FABRIC TEXTURE
══════════════════════════════════════════
- Heavy cotton canvas, denim, twill, or nylon texture matching Image 2.
- Visible stitching lines along the brim rings if present in Image 2.

══════════════════════════════════════════
STEP 4 — MANDATORY SELF CHECK
══════════════════════════════════════════
[ ] Face identical to Image 1?
[ ] Soft brim droops downward 360 degrees all around the head?
[ ] Soft cylindrical crown fits naturally on skull?
[ ] Soft circular shadow cast over forehead and upper face?
[ ] Front logo/patch reproduced accurately on the crown?
[ ] Hair emerges naturally from underneath the entire brim edge?

Output the final image only.`,
    },

    beanie_cap: {
      keywords: [
        'beanie', 'beanie cap', 'skull cap', 'knit cap', 'winter cap',
        'docker hat', 'ribbed beanie', 'cuffed beanie',
      ],
      prompt: `TASK:
Image 1: Customer photo (the person). Image 2: Product photo of a Beanie / Skull Cap (knit brimless cap)
-- (user photo is Image 1, product is Image 2)
Goal: Show the user wearing this exact beanie naturally on their head.

══════════════════════════════════════════
ABSOLUTE PRIORITY RULES — READ BEFORE ANYTHING ELSE
══════════════════════════════════════════

RULE 1 — FACE PRESERVATION IS NON-NEGOTIABLE:
- The user's face must be 100% identical to Image 1.
- Same skin tone — exact match, not approximated.
- Same facial features — eyes, nose, mouth, jawline, cheekbones unchanged.
- Same facial hair — beard, moustache, stubble reproduced exactly.
- Same expression, eye colour, eyebrow shape, lip colour, skin texture.
- Do NOT relight, smooth, brighten, or alter the face in any way.
- The face in the output must be a PERFECT COPY of Image 1.

RULE 2 — BRAND LABEL / PATCH MUST BE REPRODUCED EXACTLY:
- The brand patch (e.g. Carhartt label, woven tag) MUST appear in the output.
- Reproduce the patch at the EXACT SIZE shown in Image 2 relative to the beanie.
- Reproduce the EXACT position — centered on the front cuff, below the fold line.
- Reproduce patch background colour, logo, text, and border precisely.
- The patch sits FLAT on the knit cuff fabric — sewn onto the surface, not floating.
- If raised embroidery is present on the patch, show the 3D thread texture.

RULE 3 — BEANIE MUST FIT SKULL, NOT FLOAT:
- The beanie physically conforms to the user's skull shape.
- Zero gap between beanie and head.

══════════════════════════════════════════
STEP 1 — SKULL PLACEMENT & CUFF CURVE
══════════════════════════════════════════
- Base cuff sits across forehead approximately 1-2 fingers above eyebrows.
- The cuff fold follows the CURVE of the forehead — NOT a straight horizontal line. It curves gently at temples.
- Beanie compresses slightly against the skull with realistic fabric weight.
- Top of beanie follows the crown of the skull (fitted or slight slouch as shown in Image 2).

══════════════════════════════════════════
STEP 2 — HAIR INTERACTION
══════════════════════════════════════════
- Hair above beanie cuff line is covered/compressed inside the beanie.
- Hair below beanie cuff remains visible naturally:
  Long hair: flows out from under the beanie at sides and back.
  Short hair: ends at cuff line or emerges naturally at temples/neck.
  Curly/voluminous hair: billows out from under beanie at sides.

══════════════════════════════════════════
STEP 3 — KNIT TEXTURE & CUFF DETAILS
══════════════════════════════════════════
- Visible ribbed knit texture — vertical columns of stitches across the entire surface.
- Individual stitch rows subtly visible between rib columns.
- Folded cuff crease line clearly visible at base with doubled fabric thickness.

══════════════════════════════════════════
STEP 4 — LIGHTING & THREE-DIMENSIONALITY
══════════════════════════════════════════
- Light direction on beanie matches Image 1 face lighting exactly.
- Raised ribs catch light while recessed stitch channels sit in subtle shadow.
- Beanie wraps three-dimensionally around the head sphere.

══════════════════════════════════════════
STEP 5 — MANDATORY SELF CHECK
══════════════════════════════════════════
[ ] Face identical to Image 1 (skin tone, features, beard, expression untouched)?
[ ] Beanie sitting ON skull, conforming to head shape?
[ ] Cuff fold curves naturally with forehead curvature?
[ ] Brand patch/label centered on front cuff, correct size, flat on fabric?
[ ] Ribbed knit texture and cuff fold crease clearly visible?
[ ] Hair below cuff visible and natural?
[ ] Lighting consistent with user's face?

Output the final image only.`,
    },

    sports_cap: {
      keywords: [
        'sports cap', 'running cap', 'performance cap', 'dry fit cap',
        'breathable gym cap', 'athletic cap', 'lightweight sports cap',
      ],
      prompt: `TASK:
Image 1: Customer photo (the person). Image 2: Product photo of a Sports / Performance Cap
-- (user photo is Image 1, product is Image 2)
Goal: Show the user wearing this exact performance cap naturally on their head.

══════════════════════════════════════════
ABSOLUTE PRIORITY RULES — APPLY BEFORE ANYTHING ELSE
══════════════════════════════════════════

RULE 1 — FACE IS COMPLETELY UNTOUCHABLE:
- The user's face in the output must be a pixel-perfect copy of Image 1.
- Same skin tone, facial features, facial hair, expression, and skin texture.
- Zero face modification, smoothing, or relighting.

RULE 2 — ATHLETIC MATERIAL & DETAILS:
- Ultra-lightweight performance polyester / dry-fit synthetic fabric with a subtle technical sheen.
- Laser-cut ventilation perforations, micro-mesh side panels, or breathable seam taping MUST be reproduced if present in Image 2.
- Reflective brand logos, strips, or brim edge piping MUST catch bright specular light highlights.

RULE 3 — LOW-PROFILE ATHLETIC FIT:
- Low-profile crown hugging the skull tightly for running/athletic use.
- Flexible curved visor sitting 1-2 fingers above eyebrows.

══════════════════════════════════════════
STEP 1 — BRIM SHADOW & PLACEMENT
══════════════════════════════════════════
- Cap sits snug and tight on the skull.
- Curved visor casts a crisp, clean shadow across the user's forehead matching Image 2 lighting.
- Rear strap closure: Elastic band, Velcro tab, or quick-release clip visible at the back.

══════════════════════════════════════════
STEP 2 — HAIR INTERACTION
══════════════════════════════════════════
- Hair is tightly compressed underneath the low-profile crown.
- Lower hair exits naturally at sides and back.
- If ponytail is present, it exits seamlessly through the rear strap opening.

══════════════════════════════════════════
STEP 3 — MANDATORY SELF CHECK
══════════════════════════════════════════
[ ] Face completely identical to Image 1?
[ ] Low-profile performance fit hugging skull tightly?
[ ] Dry-fit fabric texture with laser-cut holes/mesh panels rendered?
[ ] Reflective logos/accents catching bright light highlights?
[ ] Curved visor casting clean shadow on forehead?
[ ] Rear Velcro/elastic strap and ponytail loop accurate?

Output the final image only.`,
    },

  }, // end headwear_caps subcategories

  defaultPrompt: `TASK:
Image 1: Customer photo (the person). Image 2: Product photo of Headwear / Cap
-- (user photo is Image 1, product is Image 2)
Goal: Show the user wearing this exact headwear naturally on their head.

══════════════════════════════════════════
ABSOLUTE PRIORITY RULES — APPLY BEFORE ANYTHING ELSE
══════════════════════════════════════════

RULE 1 — FACE IS COMPLETELY UNTOUCHABLE:
- The user's face in the output must be a pixel-perfect copy of Image 1.
- Same skin tone, facial features, facial hair, expression, eye colour, and skin texture.
- Do NOT relight, smooth, brighten, or alter the face in any way.
- Treat the face like a locked layer that cannot be touched.

RULE 2 — LOGO, PATCH, PRINT, AND BRAND DETAIL IS PARAMOUNT:
- Any logo, patch, embroidery, print, label, or brand detail on the headwear must be reproduced EXACTLY.
- Correct size, position, colours, and design.
- Embroidered logos must show 3D raised thread texture. Patches must sit flat on the fabric surface.
- NEVER simplify, omit, or approximate any brand detail.

RULE 3 — HEADWEAR MUST SIT ON THE HEAD, NOT FLOAT:
- The headwear must physically conform to the shape of the user's skull with zero gap.
- The headwear compresses the hair beneath it slightly.

══════════════════════════════════════════
STEP 1 — HEADWEAR TYPE & PLACEMENT SPECIFICS
══════════════════════════════════════════
- Match headwear type (baseball cap, snapback flat brim, trucker mesh, bucket hat, beanie, sports cap, fedora, beret, turban, bandana).
- Brimmed styles: Brim sits above eyebrows, curving or flat as per product, casting a natural shadow onto the user's forehead.
- Brimless styles (beanie/skull cap): Base cuff curves across forehead 1-2 fingers above eyebrows, conforming snugly to skull curvature.
- Trucker styles: Stiff foam front with sheer open-grid mesh back panels showing user's hair/scalp beneath.

══════════════════════════════════════════
STEP 2 — HAIR INTERACTION & FABRIC TEXTURE
══════════════════════════════════════════
- Top hair compressed under crown; lower hair flows out naturally from under headwear base at sides/back.
- Ponytail exits through rear strap opening if applicable.
- Fabric texture (twill weave, knit ribbing, foam/mesh, canvas, dry-fit synthetic) accurately rendered.

══════════════════════════════════════════
STEP 3 — LIGHTING & 3D DEPTH
══════════════════════════════════════════
- Headwear lighting direction matches Image 1 face lighting exactly.
- Brim casts forehead shadow at correct angle.
- Headwear wraps three-dimensionally around the head.

══════════════════════════════════════════
STEP 4 — MANDATORY SELF CHECK
══════════════════════════════════════════
[ ] Face identical to Image 1 in every detail?
[ ] Headwear sits directly ON the skull conforming to its shape?
[ ] Logos, patches, and embroidery 100% accurately reproduced?
[ ] Brim shadow cast on forehead (for brimmed styles)?
[ ] Texture, fabric details, and lighting match reference photo?

Output the final image only.`,
},

  // ─────────────────────────────────────────────
  // UNIVERSAL FALLBACK
  // Used when the shop has NO categories configured at all
  // ─────────────────────────────────────────────
  _fallback: `TASK: Virtual clothing try-on.
Image 1 = Customer photo (the person). Image 2 = Product photo of the garment to try on.
Instructions: Show the customer wearing the exact product from Image 2. Replace their current outfit with the product. Fit the garment naturally to the customer's body, pose, and proportions. Reproduce the fabric texture, colour, silhouette, and any embellishments accurately. Keep the customer's face, hair, skin tone, and background completely unchanged. Do not add any extra jewellery, accessories, or clothing. Output the final photorealistic image only.`,

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
