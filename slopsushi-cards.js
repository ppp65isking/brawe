(() => {
  const icons={Epic:'🍙',Mythic:'🍣',Legendary:'🍱',Exotic:'🧬'};
  const C=(rarity,name,desc,effects)=>({rarity,name,desc,effects,icon:icons[rarity]});
  let towerCardSerial=0;
  const D=(id,cards)=>cards.map((card,index)=>({
    id:`${id}_sushi_${index+1}`,
    ...card,
    // A stable per-card visual frequency. Besides making fused decks easy to
    // recognize in combat, this prevents two otherwise similar mechanics from
    // producing the exact same projectile aura.
    effects:{...card.effects,towerVisualSignature:++towerCardSerial}
  }));

  // Each entry supplies the real move names and a unique visual/flavor identity.
  // Cards are generated from rotating mechanic mutations so all 360 cards alter
  // an attack, Super, resource loop, or survivability state in live gameplay.
  const S={
    outlit:['Scatter Pump','Boom Break','Shell'],fuser:['Eight-Fuse Salvo','Wall-Fuser Barrage','Instability'],predator:['Through the Prey','No Escape','Hunt'],orbo:['Crisscross Orbit','Orbital Horizon','Cosmos'],homer:['Learning Shot','Targeting Pair','Lock-On'],peter_pickle:['Pickle Pitch','Petah\'s Pickles','Brine'],unstable:['Containment Failure','Going Unstable','Genome'],echo:['Sound Wave','Resonance','Reverb'],cheseypuff:['Cheese Ball','Cheese Aura','Fondue'],decayer:['Decay Shot','Dark Orbit','Void'],
    unopcoloco:['Long Scarf','Whack Landing','Fiesta'],dashaholic:['Claw Slash','Unleash the Dashaholic','Adrenaline'],trapper:['Slam Gate','Sound Fence','Backstage'],classy:['Note Burst','Bass Drop','Encore'],
    hyperorigin:['Origin Slam','Purple Unleashed','Origin'],heater_miser:['Thermal Tether','Intergalactic Heat','Furnace'],minigunnin:['Minigun Stream','Bullet Storm','Ammo'],steamer:['Steam Stream','Railroad Rush','Boiler'],
    bowlin_rida:['Bowling Burst','Pin Strike','Perfect Game'],money_and_tax:['Coin Waves','Market Crash','Profit'],hunter:['Delay Sweep','I Found You','Tracker'],chaird:['Chair Toss','Chair Spin','Furniture'],
    forest:["Nature's Wrath",'Avian Ally','Canopy'],bouncin_balls:['Ricochet Volley','Bouncy House','Pinball'],goonbob:['Gooey Splatter','Blobert Jar','Slime'],tempo_maker:['Twin Cadence','Tempo Break','Rhythm'],
    overlord:['Royal Impact','Ascension','Crown'],copyphase:['Phase Orb','Phase Theft','Glitch'],fightnfire:['Firework Shot','Firestorm','Spark'],beast:['Twin Claws','Unleash the Beast','Feral'],
    amplifier:['Ampifin','Screws and Nuts','Toolbox'],skeleflying:['Parachute Drop','Skeleton Portals','Bone'],crystila:['Crystal Arms','Overreflect','Prism'],hope:['Hopeful Shot','You Broke My Hope','Heart'],
    evil_doctor:['Infectious Shot','Spread My Virus','Virus'],splitter:['Split Grenade','Splitin Off','Fractal'],scuba_diver:['Bubble Barrage','Dash Underwater','Deep Sea'],hoop:['Bounce Breaker','Full-Court Crash','Heat Check'],
    screener:['Projected Sweep','Projected Charge','Pixel'],malakor:['Putting You Down','Hell Is Forever','Infernal'],beam:['Focus Beam','Golden Beam','Prism'],paradox:['Temporal Skip','Relativity Zone','Time'],
    sera_eclipse:['Eclipse Flare','Eclipse Orbit','Corona'],boom_arang:['Boomerang Toss','Gravity Recall','Orbit'],teether:['Bite Pattern','Tooth Fairy','Dental'],fuel:['Finger Flames','Five Flame Finger','Blowtorch'],
    xray:['Infrared Reading','Full Body Scan','Radiology'],angel:['Guiding Light','Second Life','Halo'],demon:['Hellblade','Demonic Doom','Abyss'],warrior:['Twin Spears','Final Stand','Phalanx'],relay:['Shield Signal','Move My Damage','Bandwidth'],upiedown:['Pie in the Sky','Upside-Down Pie','Bakery'],chickpig:['Breakfast Blast','Farmyard Rush','Farmhouse'],jetpack:['Crash Landing','I Drop Bombs','Flight Deck'],snapper:['Marking Orb','Snap!','Perfect Mark'],ice_cream:['Frozen Cone','Brain Freeze Dash','Soft Serve'],duck:['Breadcrumb Stream','Duck Duck Goose','Flock'],
    fastpass:['Speed Ticket','Fast Lane','Momentum'],freestyle:['Setlist','Center Stage','Encore'],portalo:['Portal Shot','Portal Prison','Dimension'],ghoul:['Haunt','Invisible Party','Nightmare'],jacktrade:['Double or Nothing','Trade of Fate','All In'],darkener:['Shroud Sweep','Darkagon','Eclipse'],awakenator:['Dream Bolt','Awaken My Past, Present and Future','Nightmare Memory']
  };

  S.rocketeer=['Breakup Rocket','Triple Impact','Warhead'];
  S.blinkeye=['Ricochet Gaze','We All See','Iris'];
  S.dr0ne=['Pulse Blaster & Swarm Command','Drone Station','Nano Repair'];
  S.ramage=['Battering Fist','Boomerang Rampage','Adrenaline Juggernaut'];

  const KIT_IDENTITY={
    outlit:'a widening pellet fan that rewards close-range center hits',fuser:'a disciplined eight-shot line that wins through sustained aim',echo:'repeating sound rings that reward lining up every pulse',cheseypuff:'cheese shots and lingering fields that reshape enemy paths',decayer:'attack hits that build permanent shield pressure',unopcoloco:'wide scarf lunges, wall vaults, and rapid landing whack combos',dashaholic:'rapid slashes chained together by repeated dashes',trapper:'thrown gates and fences that lock down movement lanes',classy:'music rings and bass patterns that layer repeated hits',hyperorigin:'heavy Origin slams backed by explosive purple power',heater_miser:'a tether whose heat ramps while the connection survives',minigunnin:'a belt-fed stream that trades mobility for nonstop pressure',steamer:'steam lanes and a railroad rush that reward straight approaches',bowlin_rida:'banked bowling shots that turn wall angles into damage',money_and_tax:'coin waves whose center projectile matters most at full ammo',hunter:'delayed sweeps that punish enemies after the warning appears',chaird:'thrown furniture and spinning chair control at close range',forest:'nature shots and an avian ally that pressure separate angles',bouncin_balls:'ricochets that become stronger when the arena provides good banks',goonbob:'goo projectiles and Blobert summons that crowd the battlefield',tempo_maker:'alternating cadence attacks that grow stronger when rhythm is maintained',overlord:'royal impacts and Ascension that turn space into a throne room',copyphase:'phase shots that steal forms and copy enemy strengths',fightnfire:'fireworks and fire zones that stack explosive area pressure',beast:'twin claws that transform into a faster feral assault',amplifier:'tool shots, screws, and machines that build a mechanical setup',skeleflying:'parachuting skeletons and portals that flood landing zones',crystila:'crystal arms that reflect pressure back through prism lanes',hope:'support shots whose strength changes with Hope\'s remaining health',evil_doctor:'poison doses that spread a virus between clustered enemies',splitter:'grenades that keep splitting into wider generations',scuba_diver:'bubble barrages and underwater movement that control safe lanes',hoop:'basketball bounces and a driving crash that reward bank angles',screener:'projected sweeps and charges that cover broad screen-shaped lanes',malakor:'short-range infernal hits built to keep enemies trapped nearby',beam:'a continuous focus beam that rewards holding the line on one target',paradox:'time-skipping attacks and relativity zones that alter combat speed',sera_eclipse:'orbiting eclipse attacks that circle back through occupied space',boom_arang:'one returning weapon whose outgoing and catch paths both matter',teether:'delayed rows of teeth that unlock a temporary floss grapple',fuel:'a flame-count cycle that ramps from one projectile into a tight inferno',xray:'infrared hits and a scanner that expose enemy ammo information',angel:'light shots that heal allies, hinder enemies, and protect a second life',demon:'a thrown blade with a brief glide choice before it returns',warrior:'paired thrown spears that become a reload-heavy final stand',relay:'shield orbs and a device that redirects incoming damage',upiedown:'a thrown pie that bursts into airborne mini pies on landing',chickpig:'egg-and-bacon control backed by separate chicken and pig summons',jetpack:'charged jumps and bombing flights that deal damage on landing',snapper:'marks that amplify the next hit before a map-wide Snap wave',rocketeer:'a main rocket that breaks into smaller rockets beyond its victim',peter_pickle:'pickle hits that grow on a streak and jars that release attackers',unstable:'decaying containers that release walking DNA when destroyed',homer:'sniper shots whose homing improves after each Super',orbo:'long-range orbs that repeatedly crisscross before a massive piercing Super',predator:'short target jumps followed by a clawing latch that holds prey in place',ice_cream:'freeze buildup that cashes out in a stun and a cone-dropping dash',duck:'a held breadcrumb stream whose damage feeds Duck and his flock',fastpass:'paired Speed Tickets that build Momentum before sharing a team-wide Fast Lane burst',freestyle:'a three-instrument Setlist cycling through disco ball, DJ keys, and healing microphones',portalo:'linked portals that displace enemies and turn battlefield paths inside out',ghoul:'invisible positioning followed by giant sky-hands that close around a chosen point',jacktrade:'a one-two-four card streak whose random Super becomes every outcome during All In',darkener:'a slow expanding shadow cone that repeatedly ticks before sealing enemies inside a vision-blocking hexagon',kage:'dual-sweep shuriken crossfires that scale with distance, hologram swaps, and explosive shadow stars',drainbow:'luminous rainbow tracks that grant speed and regeneration while draining off-road fighters',awakenator:'sleeping enemies, remembering their nightmares, and corrupting their next attack against an ally',
    blinkeye:'fast optic laser sniper shots that bounce off walls with massive range boosts, coupled with a steerable All-Seeing Eye',
    dr0ne:'dual high-velocity plasma darts that coordinate an automated combat drone swarm and deployable Drone Station'
  };

  const attackMutations=[
    (a,n)=>[`${n} Colossus`,`${a} becomes 55% larger.`,{sushiAttackSizePct:.55}],
    (a,n)=>[`${n} Longline`,`${a} travels 75% farther.`,{sushiAttackRangePct:.75}],
    (a,n)=>[`${n} Fork`, `Every ${a} forks into 2 angled copies dealing 62% damage.`,{sushiAttackForks:2}],
    (a,n)=>[`${n} Guidance`,`${a} strongly homes toward enemies within 620 pixels.`,{sushiAttackHoming:.9,sushiAttackHomingRadius:620}],
    (a,n)=>[`${n} Pinball`,`${a} bounces and gains 220% additional travel.`,{sushiAttackBounceRangePct:2.2}],
    (a,n)=>[`${n} Recall`,`${a} turns around halfway and returns through enemies.`,{sushiAttackReturn:1}],
    (a,n)=>[`${n} Needle`,`${a} pierces every enemy it touches.`,{sushiAttackPierce:1}],
    (a,n)=>[`${n} Rail`,`${a} flies 45% faster and 35% farther.`,{sushiAttackSpeedPct:.45,sushiAttackRangePct:.35}]
  ];
  const superMutations=[
    (s,n)=>[`${n} Grand Finale`,`${s} projectiles become 80% larger.`,{sushiSuperSizePct:.8}],
    (s,n)=>[`${n} Full Reach`,`${s} projectiles travel 100% farther.`,{sushiSuperRangePct:1}],
    (s,n)=>[`${n} Encore`,`${s} projectiles fork into 2 additional copies.`,{sushiSuperForks:2}],
    (s,n)=>[`${n} Lock-On`,`${s} projectiles home toward enemies.`,{sushiSuperHoming:1,sushiSuperHomingRadius:760}],
    (s,n)=>[`${n} Breakthrough`,`${s} projectiles pierce enemies.`,{sushiSuperPierce:1}],
    (s,n)=>[`${n} Rebound`,`${s} projectiles bounce with 250% extra travel.`,{sushiSuperBounceRangePct:2.5}],
    (s,n)=>[`${n} Aftershock`,`Casting ${s} grants 2400 shield and 28% speed for 4 seconds.`,{superShield:2400,superSpeedPct:.28,superSpeedMs:4000,shieldCap:5200}],
    (s,n)=>[`${n} Second Serving`,`Casting ${s} restores 2 ammo and heals 1600 HP.`,{superAmmo:2,superHeal:1600}]
  ];

  // These Supers are transformations, zones, summons, dashes, shields or
  // deployables. Projectile modifiers did nothing on them, so they receive
  // cast-triggered powers that the shared Super runtime can always apply.
  const nonProjectileSupers=new Set([
    'cheseypuff','decayer','unopcoloco','dashaholic','trapper','classy','hyperorigin',
    'steamer','hunter','chaird','forest','tempo_maker','overlord','copyphase','beast',
    'amplifier','skeleflying','crystila','scuba_diver','screener','malakor','beam',
    'paradox','sera_eclipse','fuel','xray','angel','demon','warrior','relay','upiedown','chickpig','jetpack','snapper','unstable','predator','ice_cream','awakenator'
  ]);
  const castSuperMutations=[
    (s,n)=>[`${n} Aftershock`,`Casting ${s} grants 2400 shield and 28% speed for 4 seconds.`,{superShield:2400,superSpeedPct:.28,superSpeedMs:4000,shieldCap:5200}],
    (s,n)=>[`${n} Second Serving`,`Casting ${s} restores 2 ammo and heals 1600 HP.`,{superAmmo:2,superHeal:1600}],
    (s,n)=>[`${n} Emergency Plating`,`Casting ${s} immediately grants a 3200 shield.`,{superShield:3200,shieldCap:5600}],
    (s,n)=>[`${n} Full Recovery`,`Casting ${s} immediately heals 2600 HP.`,{superHeal:2600}],
    (s,n)=>[`${n} Instant Reload`,`Casting ${s} restores all 3 ammo.`,{superAmmo:3}],
    (s,n)=>[`${n} Overdrive`,`Casting ${s} grants 45% speed for 5 seconds.`,{superSpeedPct:.45,superSpeedMs:5000}],
    (s,n)=>[`${n} Safe Deployment`,`Casting ${s} grants 1800 shield and heals 1400 HP.`,{superShield:1800,superHeal:1400,shieldCap:4800}],
    (s,n)=>[`${n} Combat Reset`,`Casting ${s} restores 1 ammo, heals 1200 HP and grants 25% speed.`,{superAmmo:1,superHeal:1200,superSpeedPct:.25,superSpeedMs:4000}]
  ];

  // Tower Transformations are grouped by how a kit is actually played. The
  // numbers are seeded per brawler, so two decks never receive the same eight
  // cards even when both brawlers belong to the same combat family.
  const artillery=new Set(['trapper','chaird','skeleflying','evil_doctor','upiedown','jetpack','peter_pickle','unstable','rocketeer']);
  const spread=new Set(['outlit','fuser','bowlin_rida','money_and_tax','bouncin_balls','fightnfire','beast','splitter','fuel','warrior','chickpig']);
  const melee=new Set(['unopcoloco','dashaholic','hyperorigin','steamer','hoop','screener','malakor','demon','predator']);
  const control=new Set(['cheseypuff','heater_miser','minigunnin','goonbob','tempo_maker','overlord','amplifier','scuba_diver','beam','paradox','sera_eclipse','teether','awakenator']);
  const familyOf=id=>artillery.has(id)?'artillery':(spread.has(id)?'spread':(melee.has(id)?'melee':(control.has(id)?'control':'precision')));
  const seeded=(id,index,slot,min,max)=>{
    let h=2166136261;
    for(const ch of `${id}:${index}:${slot}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
    return min+(h>>>0)/4294967295*(max-min);
  };
  const pct=value=>`${Math.round(value*100)}%`;

  function makeDeck(id,index){
    const [attack,superName,flavor]=S[id];
    const family=familyOf(id);
    const identity=KIT_IDENTITY[id]||`${attack} and ${superName} working as one kit`;
    const echoCount=1+(seeded(id,index,1,0,1.999)|0);
    const echoDelay=Math.round(seeded(id,index,2,235,665));
    const echoDamage=seeded(id,index,3,.51,.69);
    const radialEvery=3+(seeded(id,index,4,0,3.999)|0);
    const radialCount=3+(seeded(id,index,5,0,5.999)|0);
    const radialDamage=seeded(id,index,6,.40,.63);
    const travelGrowth=seeded(id,index,11,.24,.62), trailPct=seeded(id,index,12,.16,.34);
    const controlMs=Math.round(seeded(id,index,13,680,1710)), chain=seeded(id,index,14,.20,.49);
    const superOrbit=3+(seeded(id,index,15,0,6.999)|0), superReach=seeded(id,index,16,.33,.94);
    const superOrbitDamage=seeded(id,index,17,.40,.61);
    const thirdSuper=seeded(id,index,18,6.5,15.5), killAmmo=seeded(id,index,19,.30,.91);
    const familyHit=family==='artillery'
      ? {splashDamagePct:seeded(id,index,20,.24,.43),splashRadius:Math.round(seeded(id,index,21,118,207)),slowMs:controlMs}
      : family==='spread'
        ? {burnMs:controlMs+Math.round(seeded(id,index,22,280,610)),burnStacks:1+(seeded(id,index,23,0,2.999)|0),chainDamagePct:chain,chainRadius:Math.round(seeded(id,index,24,262,405))}
        : family==='melee'
          ? {knockback:Math.round(seeded(id,index,25,45,112)),thirdHitShield:Math.round(seeded(id,index,26,610,1240)),shieldCap:Math.round(seeded(id,index,27,4700,5700))}
          : family==='control'
            ? {pull:Math.round(seeded(id,index,28,38,94)),slowMs:controlMs+Math.round(seeded(id,index,29,410,690)),chainDamagePct:chain,chainRadius:Math.round(seeded(id,index,30,292,426))}
            : {sushiAttackPierce:1,hitSuperCharge:seeded(id,index,31,2.8,8.8)};
    return [
      C('Epic',`${attack}: ${flavor} Replay`,`${attack}'s real pattern repeats ${echoCount} time${echoCount===1?'':'s'} after ${echoDelay}ms as translucent copies dealing ${pct(echoDamage)} damage.`,{towerAttackEchoCount:echoCount,towerAttackEchoDelayMs:echoDelay,towerAttackEchoDamagePct:echoDamage}),
      C('Epic',`${flavor} ${attack} Clock ${radialEvery}`,`Every ${radialEvery}th use of ${attack} also throws ${radialCount} copies around the caster in a full circle.`,{towerRadialEveryAttacks:radialEvery,towerRadialCount:radialCount,towerRadialDamagePct:radialDamage}),
      C('Epic',`${attack}: Living ${flavor} Trajectory`,`${attack} visibly grows by ${pct(travelGrowth)} across its flight and leaves a small ${Math.round(trailPct*100)}%-damage wake instead of being only a flat size buff.`,{towerTravelGrowthPct:travelGrowth,towerTrailDamagePct:trailPct,towerTrailRadius:54+(index%8)*6,towerTrailEveryMs:320+(index%6)*45}),
      C('Mythic',`${attack}: Kit Rule Broken`,`${identity.charAt(0).toUpperCase()+identity.slice(1)}—and every hit now adds this mutation: ${family==='artillery'?'a slowing second impact':family==='spread'?'a burning chain into nearby targets':family==='melee'?'a knockback combo shield':family==='control'?'a pull-and-slow relay':'piercing Super-charge theft'}.`,familyHit),
      C('Mythic',`${superName}: ${flavor} Satellites`,`Casting ${superName} fires ${superOrbit} mini ${attack} copies around you. They deal ${pct(superOrbitDamage)} damage and use ${attack}'s real projectile visuals.`,{towerSuperOrbitCount:superOrbit,towerSuperOrbitDamagePct:superOrbitDamage}),
      C('Mythic',`${superName}: ${flavor} Geometry`,`${superName}'s projectile pattern reaches ${pct(superReach)} farther, then each projectile returns or forks so the second pass crosses the first.`,nonProjectileSupers.has(id)?{towerSuperOrbitCount:superOrbit+2,towerSuperOrbitDamagePct:seeded(id,index,32,.47,.64),superSpeedPct:seeded(id,index,33,.16,.32),superSpeedMs:Math.round(seeded(id,index,34,2700,3900))}:{sushiSuperRangePct:superReach,sushiSuperReturn:1,sushiSuperForks:1+(seeded(id,index,35,0,1.999)|0)}),
      C('Legendary',`${attack} Feeds ${superName}`,`Every third ${attack} hit restores ${thirdSuper.toFixed(1)}% Super. A defeat reloads ${killAmmo.toFixed(2)} ammo and releases a ${Math.round(chain*100)}%-damage chain, turning the kit into a repeatable loop.`,{thirdHitSuperCharge:thirdSuper,killAmmo,chainDamagePct:chain,chainRadius:Math.round(seeded(id,index,36,275,440))}),
      C('Exotic',`${attack.toUpperCase()}: ${flavor.toUpperCase()} RULES OFF`,`${attack} echoes, grows while travelling, pierces, and triggers a ${radialCount+2}-way burst every ${Math.max(2,radialEvery-1)} attacks. ${superName} fires ${superOrbit+3} copies around you.`,{towerAttackEchoCount:echoCount+1,towerAttackEchoDelayMs:Math.max(120,echoDelay-90),towerAttackEchoDamagePct:seeded(id,index,37,.63,.79),towerTravelGrowthPct:travelGrowth*.8,sushiAttackPierce:1,towerRadialEveryAttacks:Math.max(2,radialEvery-1),towerRadialCount:radialCount+2,towerRadialDamagePct:seeded(id,index,38,.48,.68),towerSuperOrbitCount:superOrbit+3,towerSuperOrbitDamagePct:seeded(id,index,39,.53,.71)})
    ];
  }

  const ids=Object.keys(S);
  const decks={}; ids.forEach((id,index)=>decks[id]=makeDeck(id,index));

  // Signature overrides use dedicated runtime hooks for the most identity-heavy kits.
  const O=(id,slot,card)=>{decks[id][slot]=card;};
  decks.steamer=[
    C('Epic','Sweet-Spot Express','Steam Lance\'s maximum-damage sweet spot expands to cover almost the entire stream.',{steamerSweetZonePct:.72}),
    C('Epic','Boiler Pressure Ladder','Firing Steam Lance within 1.5 seconds of the last stream adds one Pressure stage. Each stage deals 12% more damage, up to 5 stages.',{steamerPressureDamagePct:.12,steamerPressureCap:5,steamerPressureWindowMs:1500}),
    C('Epic','Backdraft Nozzle','Every Steam Lance also vents a shorter stream directly behind Steamer for 45% damage.',{steamerBackdraftDamagePct:.45}),
    C('Mythic','Wide-Gauge Railroad','Railroad\'s triangle becomes 45% wider. Its burning rail trail becomes 55% wider and lasts 1 second longer.',{steamerRailRadiusPct:.45,steamerTrailRadiusPct:.55,steamerTrailBonusMs:1000}),
    C('Mythic','Round-Trip Ticket','Railroad completes one additional full lap before Steamer leaves the track.',{steamerExtraRailLaps:1}),
    C('Mythic','Cross-Vent Carriages','While riding Railroad, Steamer adds two diagonal steam vents between the normal left-and-right blasts.',{steamerCrossVents:2}),
    C('Legendary','Explosive Stations','Every time Railroad reaches a pole, that station erupts for 700 damage and launches nearby enemies away.',{steamerStationBlastDamage:700,steamerStationBlastRadius:145,steamerStationKnockback:115}),
    C('Exotic','RUNAWAY LOCOMOTIVE','Steam Lance always deals sweet-spot damage and fires a backdraft. Railroad runs 4 laps, vents twice as frequently, and triggers Explosive Stations.',{steamerRunawayEngine:1,steamerBackdraftDamagePct:.55,steamerStationBlastDamage:850,steamerStationBlastRadius:165,steamerStationKnockback:135})
  ];
  O('ice_cream',0,C('Epic','Triple Scoop Stack','Frozen Cone becomes 3 tightly packed scoops. Each deals 55% damage and adds 18% Freeze.',{iceCreamTripleScoop:1}));
  O('ice_cream',1,C('Epic','Waffle Cone Shatter','Frozen Cone grows 65% wider and shatters into 2 side scoops on its first enemy hit.',{iceCreamWaffleShatter:1}));
  O('ice_cream',2,C('Epic','Deep Freezer Dial','Every Ice Cream attack, dash scoop, and puddle applies 45% more Freeze.',{iceCreamFreezePct:.45}));
  O('ice_cream',3,C('Mythic','Brain Freeze Express','Brain Freeze Dash plants 3 additional firing cones along its route.',{iceCreamExtraDashCones:3}));
  O('ice_cream',4,C('Mythic','Black Ice Sundae','Hyper puddles become 80% larger and remain for 1.5 additional seconds.',{iceCreamPuddleRadiusPct:.8,iceCreamPuddleBonusMs:1500}));
  O('ice_cream',5,C('Mythic','Scoop Crossfire','Every Brain Freeze cone fires forward and backward in addition to left and right.',{iceCreamCrossfire:1}));
  O('ice_cream',6,C('Legendary','Shatter Celebration','Freezing an enemy bursts for 450 damage and adds 25% Freeze to every nearby enemy.',{iceCreamFreezeBurst:450}));
  O('ice_cream',7,C('Exotic','ABSOLUTE ZERO','A direct Frozen Cone sets enemies to at least 70% Freeze. Super scoops pierce, and Hyper puddles pull enemies toward their frozen center.',{iceCreamAbsoluteZero:1}));
  O('money_and_tax',0,C('Epic','Money Printer Platter','Money mode fires 2 additional waves of coins.',{moneyExtraWaves:2}));
  O('money_and_tax',1,C('Epic','Center-Coin Stimulus','At full ammo, center coins grow 90% and deal 35% more damage.',{moneyCenterSizePct:.9,moneyCenterDamagePct:.35}));
  // Bouncin' Balls has a fully bespoke deck. Every card changes his volley,
  // wall-bank, split-ball, or Bouncy House loop instead of borrowing a shared
  // projectile/stat template.
  O('bouncin_balls',0,C('Epic','Around-the-World Roll','Every attack and Super ball gets 400% more travel distance for absurd cross-map bank shots.',{bouncyRangePct:4}));
  O('bouncin_balls',1,C('Epic','Ball Pit Collision','The first enemy hit by each ball bursts it into 2 smaller balls that rebound in opposite directions.',{bouncySplitOnHit:1}));
  O('bouncin_balls',2,C('Epic','Rapid-Fire Rack','Ricochet Volley loads 4 extra balls and releases the entire rack 35% faster.',{bouncyExtraBalls:4,bouncyVolleyDelayPct:.35}));
  O('bouncin_balls',3,C('Mythic','Bank Interest','Each wall bounce grows that ball by 18% and raises its current damage by 12%, stacking up to 5 banks.',{bouncyBounceSizePct:.18,bouncyBounceDamagePct:.12}));
  O('bouncin_balls',4,C('Mythic','Called Bank','After its first wall bounce, each ball locks onto the nearest enemy while keeping its rebound speed.',{bouncyCalledBank:1}));
  O('bouncin_balls',5,C('Mythic','Bouncy House Speakers','Every Bouncy House ball creates a 420-damage, 82-radius shockwave whenever it hits a wall.',{bouncySuperBounceBlast:420,bouncySuperBounceBlastRadius:82}));
  O('bouncin_balls',6,C('Legendary','Third-Bank Jackpot','On its third wall bounce, each ball explodes and launches 6 mini-balls in every direction. This happens once per ball.',{bouncyThirdBounceBurst:6}));
  O('bouncin_balls',7,C('Exotic','Perpetual Motion','Every attack and Super ball bounces forever, keeps full damage, pierces enemies, and has infinite range.',{bouncyInfiniteBounce:1}));
  // Minigunnin's deck is built around his belt-fed firing loop, permanent
  // Max-HP growth, and the walls/healing/turret pieces of Healing Fort.
  O('minigunnin',0,C('Epic','Bottomless Belt Buffet','Minigun Stream consumes 1 belt round per shot instead of 2, effectively doubling sustained fire time.',{minigunAmmoCost:1}));
  O('minigunnin',1,C('Epic','Brass Avalanche','Every trigger tick fires 2 additional rounds in a wider layered spray.',{minigunExtraRounds:2}));
  O('minigunnin',2,C('Epic','Redline Receiver','Continuous fire builds 1 Redline stage per shot, up to 20. Each stage adds 4% bullet damage; pausing resets the engine.',{minigunRedlinePct:.04,minigunRedlineCap:20}));
  O('minigunnin',3,C('Mythic','Wall-Eater Tracer','Every 8th round becomes a huge piercing tracer that explodes for 520 damage on its first enemy hit.',{minigunTracerEvery:8,minigunTracerBlast:520}));
  O('minigunnin',4,C('Mythic','Hospital-Sized Hospital','Healing Fort gains 55% healing radius and restores 80% more HP every pulse.',{minigunFortRadiusPct:.55,minigunFortHealPct:.8}));
  O('minigunnin',5,C('Mythic','Concrete Donut','Healing Fort builds 12 additional wall blocks, and every block gains 60% more HP.',{minigunExtraWalls:12,minigunWallHpPct:.6}));
  O('minigunnin',6,C('Legendary','Fort With Benefits','Healing Fort is always armed—even without Hypercharge. Its attack pulses 65% faster and deal 75% more damage.',{minigunArmedFort:1,minigunTurretSpeedPct:.65,minigunTurretDamagePct:.75}));
  O('minigunnin',7,C('Exotic','THE ENTIRE AMMO FACTORY','Minigunnin has unlimited belt ammo, always fires 5 rounds, stays at maximum Redline, and every round becomes an explosive piercing tracer. Healing Fort receives every fort upgrade.',{minigunAmmoFactory:1}));
  // Boom-Arang's deck is entirely built around his one-weapon throw/catch,
  // enemy tags, returning lane, and Gravity Recall pull path.
  O('boom_arang',0,C('Epic','Twin Flight Plan','Boomerang Toss throws a second angled boomerang dealing 65% damage. Both must return before the next throw.',{boomTwinToss:1}));
  O('boom_arang',1,C('Epic','Tag Popcorn','Every TAG BOOM launches 4 mini-boomerangs outward from the tagged enemy.',{boomTagBurst:4}));
  O('boom_arang',2,C('Epic','Express Return','Returning boomerangs fly 65% faster, deal 105% of outgoing damage instead of 80%, and heal 900 HP when caught.',{boomReturnSpeedPct:.65,boomReturnDamagePct:.25,boomCatchHeal:900}));
  O('boom_arang',3,C('Mythic','Catch and Release','Catching a main boomerang instantly sprays 6 mini-boomerangs in a full circle.',{boomCatchBurst:6}));
  O('boom_arang',4,C('Mythic','Tag, You Are All It','Applying a fresh tag copies it to the 2 nearest enemies around the target.',{boomTagRelay:2}));
  O('boom_arang',5,C('Mythic','Gravity Traffic Jam','Gravity Recall launches 5 boomerangs instead of 3 and each path has 75% more pull radius.',{boomSuperExtra:2,boomPullRadiusPct:.75}));
  O('boom_arang',6,C('Legendary','Orbit Guard','Every catch creates 3 orbiting boomerangs for 5 seconds. They repeatedly slice enemies who approach Boom-Arang.',{boomOrbitGuard:3}));
  O('boom_arang',7,C('Exotic','Boomerang Galaxy','Boom-Arang gains unlimited throws: every main attack launches 5 boomerangs and Gravity Recall launches 9.',{boomGalaxy:1}));
  // Skeleflying turns the arena itself into an airborne skeleton invasion.
  // These cards mutate his para-shoot formations, landing events, portals,
  // and summoned troopers instead of using shared projectile stat templates.
  O('skeleflying',0,C('Epic','Bone Carpet Formation','Para-Shoot Barrage drops 7 parachutes across a much wider formation instead of 3.',{skeleMainExtraDrops:4,skeleMainSpreadPct:.7}));
  O('skeleflying',1,C('Epic','Dead-Air Encore','Every para-shoot landing calls down a smaller encore parachute on the same spot 0.55 seconds later.',{skeleDropEcho:1}));
  O('skeleflying',2,C('Epic','Vacuum Landing Permit','Each falling skeleton drags nearby enemies into its landing marker immediately before exploding.',{skeleDropVacuum:260}));
  O('skeleflying',3,C('Mythic','Surprise Skeleton Passenger','Every main-attack parachute leaves behind a temporary skeletrooper, even without Hypercharge.',{skeleMainPassenger:1}));
  O('skeleflying',4,C('Mythic','Portal Constellation','Comin Down! opens 7 portals in a huge curved constellation instead of 3.',{skeleSuperExtraPortals:4,skeleSuperSpreadPct:.8}));
  O('skeleflying',5,C('Mythic','Two Skeletons, One Chute','Every Super portal lands with 2 skeletroopers shoulder-to-shoulder.',{skelePortalTroopers:2}));
  O('skeleflying',6,C('Legendary','Ossuary Titans','All summoned troopers become giant Bone Titans with 250% more HP, 80% larger sword swipes, and double sword damage.',{skeleTitanHpPct:2.5,skeleTitanSizePct:.7,skeleTitanSwordPct:1,skeleTitanSlashSizePct:.8}));
  O('skeleflying',7,C('Exotic','THE SKY HAS BONES','Main attacks rain 9 homing parachutes that all leave troopers; Comin Down! tears open 12 moving portals, each carrying 2 troopers.',{skeleSkyTakeover:1}));
  // Heater Miser's deck rewires the tether ramp, reconnection economy, Flux
  // network, and Furnace Zone rather than borrowing generic projectile stats.
  O('heater_miser',0,C('Epic','Industrial Extension Cord','Thermal Tether gains 70% lock and hold range. The starter spark and aiming line extend to match.',{heaterRangePct:.7}));
  O('heater_miser',1,C('Epic','Microwave Preheat Button','Every new tether begins with 4 seconds of heat already built, starting at Ramp Stage 3.',{heaterPreheatMs:4000}));
  O('heater_miser',2,C('Epic','Heat Insurance Policy','When a tether breaks, bank 70% of its ramp for 5 seconds. Your next connection resumes from that stored heat.',{heaterHeatBankPct:.7,heaterHeatBankMs:5000}));
  O('heater_miser',3,C('Mythic','Neighborhood Heating Grid','Every tether tick chains to the 3 nearest matching targets at 65% power—even without Three-Way Flux.',{heaterFluxTargets:3,heaterFluxPowerPct:.65}));
  O('heater_miser',4,C('Mythic','Closed-Loop Radiator','Hostile tether damage heals Heater Miser for 30% of every direct and chained heat tick.',{heaterFeedbackHealPct:.3}));
  O('heater_miser',5,C('Mythic','Three-Furnace Problem','Intergalactic Heat creates 3 Furnace Zones in a triangular formation instead of one.',{heaterExtraZones:2}));
  O('heater_miser',6,C('Legendary','Stage Seven: Core Meltdown','At maximum ramp, Thermal Tether detonates a 420-damage heat blast around its target every 0.9 seconds.',{heaterMeltdownDamage:420,heaterMeltdownRadius:180}));
  O('heater_miser',7,C('Exotic','GLOBAL WARMING SPEEDRUN','Thermal Tether has map-wide range, ignores walls, begins at Stage 7, and chains to 5 targets. Intergalactic Heat creates 5 pulling Furnace Zones.',{heaterGlobalHeating:1}));
  O('classy',7,C('Exotic','Endless Encore','Note Burst has unlimited ammo, infinite range, perfect homing, and pierces every enemy.',{classyEndlessEncore:1}));
  O('outlit',0,C('Epic','Open-Faced Scatter','Scatter Pump opens into a much wider fan and fires 2 extra pellets.',{outlitSpreadMult:1.85,outlitExtraPellets:2}));
  O('outlit',1,C('Epic','Cannonball Crumbs','Pellets become 70% larger but travel 15% slower.',{outlitProjectileSizePct:.7,outlitProjectileSpeedPct:-.15}));
  O('teether',0,C('Epic','Second Row of Teeth','Bite Pattern adds a fourth delayed row with 3 wide teeth.',{teetherExtraToothWave:1}));
  O('teether',1,C('Epic','Dental-Floss Longline','Floss Line gains 55% range and a larger enemy lock.',{teetherFlossRangePct:.55,teetherLockRadius:70}));
  O('fuel',0,C('Epic','Six-Finger Cycle','The flame cycle continues to 5 and 6 before resetting.',{fuelCycleMax:6}));
  O('fuel',1,C('Epic','Ten-Second Stove','Five Flame Finger lasts 6.75 extra seconds.',{fuelSuperBonusMs:6750}));
  O('xray',0,C('Epic','Full-Penetration Plate','Infrared Reading pierces and grows 45% wider.',{xrayPierce:1,sushiAttackSizePct:.45}));
  O('xray',1,C('Epic','Lead-Lined Machine','The X-ray machine gains 60% HP and stops decaying.',{xrayMachineHpPct:.6,xrayNoDecay:1}));
  O('angel',0,C('Epic','Three-Ray Halo','Guiding Light always fires 3 rays in quick succession.',{angelExtraBurst:2}));
  O('angel',1,C('Epic','Everyone Gets Another Life','Second Life protects the entire living team.',{angelSuperTeam:1}));
  O('demon',0,C('Epic','Twin Hellblades','Every main attack throws a second spectral blade.',{demonExtraBlade:1}));
  O('demon',1,C('Epic','Longer Temptation','The glide decision window lasts 2.5 seconds.',{demonGlideBonusMs:1500}));
  O('warrior',0,C('Epic','Four-Spear Formation','Normal attacks throw 4 spears instead of 2.',{warriorExtraSpears:2}));
  O('warrior',1,C('Epic','Explosive Tips','Normal spear landings explode for area damage.',{warriorExplosiveMain:1}));
  O('relay',0,C('Epic','Overcharged Signal','Shield Signal grants 75% more shield with a 12000 cap.',{relayShieldPct:.75,relayShieldCap:12000}));
  O('relay',1,C('Epic','Industrial Relay','The device gains 75% HP and 65% connection radius.',{relayDeviceHpPct:.75,relayLinkRadiusPct:.65}));
  O('splitter',7,C('Exotic','Split Into Split Into Split!','Main grenades gain a third full splitting generation.',{splitterExoticCascade:1}));
  O('rocketeer',0,C('Epic','Six-Pack Separation','Every Breakup Rocket releases 3 additional mini-rockets.',{rocketeerExtraMinis:3}));
  O('rocketeer',1,C('Epic','Napalm Pockets','Mini-rocket fire zones are 55% larger and last 75% longer.',{rocketeerFireRadiusPct:.55,rocketeerFireDurationPct:.75}));
  O('rocketeer',2,C('Epic','Hotter Exhaust','Breakup Rockets fire and reload 25% faster.',{fireDelayPct:.25,reloadPct:.25}));
  O('rocketeer',3,C('Mythic','Chain of Command','Breakup Rocket launches two angled copies dealing 62% damage.',{rocketeerExtraMainRockets:2}));
  O('rocketeer',4,C('Mythic','Five-Rocket Forecast','Triple Impact calls down 2 additional big rockets.',{rocketeerExtraSuperStrikes:2}));
  O('rocketeer',5,C('Mythic','Permanent Burn Notice','Every big Super rocket leaves a 4-second fire zone, even without Gravity Warheads.',{rocketeerSuperFire:1}));
  O('rocketeer',6,C('Legendary','Sixteen Directions','Hypercharged Super impacts launch 16 radial rockets instead of 8.',{rocketeerHyperRadial:16}));
  O('rocketeer',7,C('Exotic','Rocket Weather','Breakup Rocket releases 12 mini-rockets with 100% extra range; Triple Impact rains 7 big rockets.',{rocketeerExtraMinis:9,sushiAttackRangePct:1,rocketeerExtraSuperStrikes:4}));

  // Bouncin' Balls is the Season 2 quality bar: every Transformation mutates
  // the actual bank-shot loop rather than adding a generic stat sticker.
  decks.bouncin_balls=[
    C('Epic','Inflation Per Bank','Every wall bounce makes that ball 25% bigger, stacking through its first 5 bounces.',{bouncyBounceSizePct:.25,bouncyBounceGrowthCap:5}),
    C('Epic','House With No Backyard','Bouncy House balls gain 100% range, so the Super can bank across the entire fight.',{sushiSuperRangePct:1}),
    C('Epic','Range Refund','Main-attack balls gain 30% of their original travel on every bounce instead of losing range, up to 5 refunds.',{bouncyBounceRangeGainPct:.30,bouncyBounceGrowthCap:5}),
    C('Mythic','Four-Second Ball Alarm','Once every 4 seconds, firing Ricochet Volley also launches 3 balls around Bouncin in a full circle.',{bouncyAttackOrbitMs:4000,bouncyAttackOrbitBalls:3,bouncyAttackOrbitDamagePct:.72}),
    C('Mythic','Fifth-Bank Fireworks','A ball completing its fifth wall bounce bursts into 5 mini-balls. Each original ball can trigger this once.',{bouncyFifthBounceBurst:5,bouncyBurstDamagePct:.48}),
    C('Mythic','Rebound Payday','The first enemy hit after a wall bounce restores 0.40 ammo. Each ball can pay out once.',{bouncyBankAmmo:.40}),
    C('Legendary','Bouncy-House Earthquake','Every Super-ball wall bounce creates a 520-damage shockwave with a 95-pixel radius.',{bouncySuperBounceBlast:520,bouncySuperBounceBlastRadius:95}),
    C('Exotic','PERPETUAL MOTION DEPARTMENT','Every ball bounces forever with infinite range and no damage loss; each fifth bank still launches 5 mini-balls.',{bouncyInfiniteBounce:1,bouncyFifthBounceBurst:5,bouncyBurstDamagePct:.52})
  ];

  // Every deck below is authored card-by-card around the named kit. Nothing in
  // this table is produced by makeDeck: these entries replace the remaining
  // generated decks before they are exported to the live game.
  const handmadeDecks={
    outlit:[
      C('Epic','Sawed-Off Confetti','Scatter Pump fires 4 extra pellets in a wider fan, turning point-blank shots into a wall of shells.',{outlitExtraPellets:4,outlitSpreadMult:2.15}),
      C('Epic','Bowling-Ball Buckshot','Every pellet becomes 85% larger and carries a small knockback.',{outlitProjectileSizePct:.85,knockback:38}),
      C('Epic','Long Hallway Pump','Scatter Pump gains 55% range while keeping its full pellet count.',{sushiAttackRangePct:.55}),
      C('Mythic','Shell Recycling Bin','Each damaging pellet has a 16% chance to refund one ammo.',{ammoRefundChance:.16}),
      C('Mythic','Boom Break: Double Door','Boom Break forks into two crossing blast lanes and reaches 45% farther.',{sushiSuperForks:2,sushiSuperRangePct:.45}),
      C('Mythic','Emergency Room Breach','Casting Boom Break grants 1800 shield and reloads 1 ammo.',{superShield:1800,superAmmo:1,shieldCap:5600}),
      C('Legendary','Center-Pellet Receipt','Every third Scatter Pump hit restores 13% Super and 0.35 ammo.',{thirdHitSuperCharge:13,thirdHitAmmo:.35}),
      C('Exotic','OUTLIT THE WHOLE ROOM','Scatter Pump fires 9 extra piercing pellets, echoes once, and Boom Break fires three returning lanes.',{outlitExtraPellets:9,outlitSpreadMult:2.6,sushiAttackPierce:1,towerAttackEchoCount:1,towerAttackEchoDelayMs:180,towerAttackEchoDamagePct:.72,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    fuser:[
      C('Epic','Sixteen-Step Fuse','Eight-Fuse Salvo repeats once after 260ms at 58% damage, preserving the straight firing line.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:260,towerAttackEchoDamagePct:.58}),
      C('Epic','Needle-Thread Receiver','The eight bullets become 35% smaller, fly 60% faster, and travel 40% farther.',{sushiAttackSizePct:-.35,sushiAttackSpeedPct:.6,sushiAttackRangePct:.4}),
      C('Epic','Alternating Current','Every third salvo releases 4 side bullets at right angles to the main line.',{towerRadialEveryAttacks:3,towerRadialCount:4,towerRadialDamagePct:.56}),
      C('Mythic','Wall-Fuser Rounds','Main bullets pierce enemies and deal a 26% chain hit to the closest target.',{sushiAttackPierce:1,chainDamagePct:.26,chainRadius:250}),
      C('Mythic','Barrage Capacitor','Casting Wall-Fuser Barrage instantly reloads 2 ammo and grants 22% speed for 3.2 seconds.',{superAmmo:2,superSpeedPct:.22,superSpeedMs:3200}),
      C('Mythic','Return Wiring','Every Super bullet reverses at maximum range and crosses its original firing lane.',{sushiSuperReturn:1,sushiSuperRangePct:.25}),
      C('Legendary','Perfect Eight','Every third damaging bullet grants 9.5% Super and a 520 shield.',{thirdHitSuperCharge:9.5,thirdHitShield:520,shieldCap:5000}),
      C('Exotic','FUSEBOX MELTDOWN','Every salvo echoes twice, pierces, and fires 6 cross-current rounds; the Super returns with three forked lanes.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:170,towerAttackEchoDamagePct:.66,sushiAttackPierce:1,towerRadialEveryAttacks:1,towerRadialCount:6,towerRadialDamagePct:.52,sushiSuperReturn:1,sushiSuperForks:3})
    ],
    predator:[
      C('Epic','Long Pounce License','Through the Prey gains 65% targeting range and deals 18% more damage.',{sushiAttackRangePct:.65,damagePct:.18}),
      C('Epic','Cross-Claw Landing','Each successful pounce knocks prey sideways and splashes 32% damage around the landing.',{knockback:72,splashDamagePct:.32,splashRadius:135}),
      C('Epic','Scent of Panic','Hitting prey grants 24% movement speed for 1.8 seconds.',{hitSpeedPct:.24,hitSpeedMs:1800}),
      C('Mythic','Hide From This','Through the Prey pierces its first target and pulls the next victim toward Predator.',{sushiAttackPierce:1,pull:62}),
      C('Mythic','No Escape Cushion','Latching with No Escape grants 2600 shield for the clawing duration.',{superShield:2600,shieldCap:6200}),
      C('Mythic','Second Hunt','Casting No Escape restores 2 ammo and grants 35% speed for 4 seconds.',{superAmmo:2,superSpeedPct:.35,superSpeedMs:4000}),
      C('Legendary','Food Chain Reset','A defeat fully restores 1 ammo, heals 1700 HP, and grants 20% speed.',{killAmmo:1,killHeal:1700,killSpeedPct:.2,killSpeedMs:3500}),
      C('Exotic','APEX PREDATOR','Every pounce repeats twice as spectral cross-claws, pulls prey back, and every latch grants 4200 shield plus full ammo.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:150,towerAttackEchoDamagePct:.74,pull:95,damagePct:.3,superShield:4200,superAmmo:3,shieldCap:7600})
    ],
    orbo:[
      C('Epic','Six-Orb Loom','Crisscross Orbit fires 2 additional orbs through the existing weave.',{sushiAttackForks:2}),
      C('Epic','Fifth Crossing','Every orb gains 65% range so the crisscross pattern completes an extra long crossing.',{sushiAttackRangePct:.65}),
      C('Epic','Orbiting Snowball','Orbs grow by 52% across their flight and leave a 20%-damage cosmic wake.',{towerTravelGrowthPct:.52,towerTrailDamagePct:.2,towerTrailRadius:68,towerTrailEveryMs:360}),
      C('Mythic','Constellation Collision','Hits chain 34% damage to the nearest enemy within 360 pixels.',{chainDamagePct:.34,chainRadius:360}),
      C('Mythic','Orbital Horizon: Wide Universe','The massive Super orb becomes 140% larger and travels 80% farther.',{sushiSuperSizePct:1.4,sushiSuperRangePct:.8}),
      C('Mythic','Three-Moon Return','Orbital Horizon forks into 2 side moons; all three return through the map.',{sushiSuperForks:2,sushiSuperReturn:1}),
      C('Legendary','Gravity Tax','Every third orb hit pulls its victim 85 pixels and restores 11% Super.',{pull:85,thirdHitSuperCharge:11}),
      C('Exotic','THE UNIVERSE CRISSCROSSES','Main attacks fire 4 extra piercing, homing orbs with infinite-looking reach; Super becomes five enormous returning moons.',{sushiAttackForks:3,sushiAttackPierce:1,sushiAttackHoming:.8,sushiAttackHomingRadius:780,sushiAttackRangePct:1.6,sushiSuperForks:3,sushiSuperReturn:1,sushiSuperSizePct:1.8})
    ],
    homer:[
      C('Epic','Warm-Up Scope','Learning Shot begins with 35% homing instead of waiting for several Super upgrades.',{sushiAttackHoming:.35,sushiAttackHomingRadius:620}),
      C('Epic','Long-Distance Lesson','Learning Shot gains 70% range and 32% projectile speed.',{sushiAttackRangePct:.7,sushiAttackSpeedPct:.32}),
      C('Epic','Study Partner','Every shot forks one 62%-damage study copy toward a second angle.',{sushiAttackForks:1}),
      C('Mythic','Homework Pays','Every third sniper hit restores 14% Super.',{thirdHitSuperCharge:14}),
      C('Mythic','Targeting Quartet','Targeting Pair fires 2 additional homing projectiles and all four are 45% larger.',{sushiSuperForks:2,sushiSuperSizePct:.45}),
      C('Mythic','Lock-On Overflow','Casting Targeting Pair grants 30% movement speed and reloads 1.5 ammo.',{superSpeedPct:.3,superSpeedMs:3600,superAmmo:1.5}),
      C('Legendary','Perfect Attendance','A marked hit chains 41% damage to another nearby target and heals Homer for 18% of damage.',{chainDamagePct:.41,chainRadius:410,lifestealPct:.18}),
      C('Exotic','HOMING IS THE ANSWER','Learning Shot has perfect map-wide homing, pierces, and echoes once; Targeting Pair becomes six returning seekers.',{sushiAttackHoming:1,sushiAttackHomingRadius:2200,sushiAttackPierce:1,sushiAttackRangePct:2,towerAttackEchoCount:1,towerAttackEchoDelayMs:220,towerAttackEchoDamagePct:.8,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    peter_pickle:[
      C('Epic','Dill Growth Spurt','Pickle Pitch grows 38% during flight and gains 45% range, making streak pickles visually enormous.',{towerTravelGrowthPct:.38,sushiAttackRangePct:.45}),
      C('Epic','Brine Ricochet','Pickles bounce with 180% extra travel and apply a 1.1-second slow.',{sushiAttackBounceRangePct:1.8,slowMs:1100}),
      C('Epic','Pickle Fork','Every thrown pickle forks into 2 smaller pickles dealing 62% damage.',{sushiAttackForks:2}),
      C('Mythic','Crunchy Lifesteal','Pickle damage heals Peter for 23% and every third hit restores 0.4 ammo.',{lifestealPct:.23,thirdHitAmmo:.4}),
      C('Mythic','Jar Delivery Insurance','Throwing Petah’s Pickles grants 2200 shield and 1 ammo.',{superShield:2200,superAmmo:1,shieldCap:6000}),
      C('Mythic','Brine Splashdown','Super projectiles become 75% larger and landing damage chains for 29% nearby.',{sushiSuperSizePct:.75,chainDamagePct:.29,chainRadius:305}),
      C('Legendary','Pickle Parade','Every fourth Pickle Pitch launches 5 pickles around Peter.',{towerRadialEveryAttacks:4,towerRadialCount:5,towerRadialDamagePct:.6}),
      C('Exotic','PETAHS ENTIRE PANTRY','Pickles grow 95%, pierce and split; every attack launches a five-way pickle parade, while jars arrive with a 3800 shield.',{towerTravelGrowthPct:.95,sushiAttackPierce:1,sushiAttackForks:2,towerRadialEveryAttacks:1,towerRadialCount:5,towerRadialDamagePct:.68,superShield:3800,shieldCap:7600})
    ],
    unstable:[
      C('Epic','Long-Distance Specimen','Containment Failure throws 60% farther and its container projectile becomes 45% larger.',{sushiAttackRangePct:.6,sushiAttackSizePct:.45}),
      C('Epic','Double Sample Label','Each container throw forks into 2 angled specimen containers.',{sushiAttackForks:2}),
      C('Epic','DNA Magnetism','Damage from released DNA pulls enemies 58 pixels toward the specimen.',{pull:58}),
      C('Mythic','Genome Dividend','Every third DNA hit grants 900 shield and 8% Super.',{thirdHitShield:900,thirdHitSuperCharge:8,shieldCap:5600}),
      C('Mythic','Hazmat Spin','Going Unstable grants 2800 shield and 28% movement speed for 4.5 seconds.',{superShield:2800,superSpeedPct:.28,superSpeedMs:4500,shieldCap:6600}),
      C('Mythic','Runaway Samples','Super containers travel 70% farther and return through their release lanes.',{sushiSuperRangePct:.7,sushiSuperReturn:1}),
      C('Legendary','Contagious Genome','DNA damage chains 38% to another enemy and heals Unstable for 16%.',{chainDamagePct:.38,chainRadius:335,lifestealPct:.16}),
      C('Exotic','CONTAINMENT WAS OPTIONAL','Every container throw triples, pierces, and leaves a genetic wake; Going Unstable grants 4400 shield and full ammo.',{sushiAttackForks:2,sushiAttackPierce:1,towerTrailDamagePct:.31,towerTrailRadius:92,towerTrailEveryMs:290,superShield:4400,superAmmo:3,shieldCap:8200})
    ],
    echo:[
      C('Epic','Third Ring Reverb','Sound Wave repeats twice behind itself at 61% damage.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:240,towerAttackEchoDamagePct:.61}),
      C('Epic','Auditorium Ring','Every sound ring becomes 60% larger and travels 45% farther.',{sushiAttackSizePct:.6,sushiAttackRangePct:.45}),
      C('Epic','Split Stereo','Sound Wave forks into left and right stereo rings.',{sushiAttackForks:2}),
      C('Mythic','Feedback Shield','Echo heals for 17% of ring damage and converts another 14% into shield.',{lifestealPct:.17,damageShieldPct:.14,shieldCap:5200}),
      C('Mythic','Resonance Hall','Resonance gains 80% range and its rings return for a second pass.',{sushiSuperRangePct:.8,sushiSuperReturn:1}),
      C('Mythic','Bass Safety Barrier','Casting Resonance grants 2500 shield and heals 1100 HP.',{superShield:2500,superHeal:1100,shieldCap:6400}),
      C('Legendary','Perfect Frequency','Every third ring hit restores 16% Super and 0.5 ammo.',{thirdHitSuperCharge:16,thirdHitAmmo:.5}),
      C('Exotic','ECHO NEVER ENDS','Sound Wave echoes three times, grows while traveling, pierces, and Resonance releases three returning ring lanes.',{towerAttackEchoCount:3,towerAttackEchoDelayMs:170,towerAttackEchoDamagePct:.7,towerTravelGrowthPct:.7,sushiAttackPierce:1,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    cheseypuff:[
      C('Epic','Mozzarella Moon','Cheese Ball becomes 75% larger and travels 55% farther.',{sushiAttackSizePct:.75,sushiAttackRangePct:.55}),
      C('Epic','Swiss-Hole Split','Cheese Ball forks into 3 airy cheese wedges.',{sushiAttackForks:3}),
      C('Epic','Sticky Fondue Hit','Every Cheese Ball hit slows for 1.6 seconds and pulls the enemy 42 pixels.',{slowMs:1600,pull:42}),
      C('Mythic','Cheese Tax Refund','Every third cheesy hit restores 0.6 ammo and 10% Super.',{thirdHitAmmo:.6,thirdHitSuperCharge:10}),
      C('Mythic','Aura With Crust','Casting Cheese Aura grants 2300 shield and 25% speed for 4 seconds.',{superShield:2300,superSpeedPct:.25,superSpeedMs:4000,shieldCap:5900}),
      C('Mythic','Fondue Fountain','Cheese Aura heals 2100 HP immediately and restores 1 ammo.',{superHeal:2100,superAmmo:1}),
      C('Legendary','Cheese Chain Restaurant','Cheese damage chains 44% to the nearest enemy in a 390-pixel radius.',{chainDamagePct:.44,chainRadius:390}),
      C('Exotic','THE MOON IS CHEESE','Every Cheese Ball is huge, piercing, homing fondue that forks three ways; Cheese Aura grants 4000 shield and full ammo.',{sushiAttackSizePct:1.2,sushiAttackPierce:1,sushiAttackHoming:.85,sushiAttackHomingRadius:720,sushiAttackForks:3,superShield:4000,superAmmo:3,shieldCap:8000})
    ],
    decayer:[
      C('Epic','Void Needle Extension','Decay Shot gains 65% range and pierces enemies.',{sushiAttackRangePct:.65,sushiAttackPierce:1}),
      C('Epic','Shield Harvest','Damage dealt becomes 24% shield with a 7000 cap.',{damageShieldPct:.24,shieldCap:7000}),
      C('Epic','Dark-Matter Splash','Hits splash 35% damage in a 155-pixel void burst.',{splashDamagePct:.35,splashRadius:155}),
      C('Mythic','Orbiting Decay','Every fourth shot releases 6 void shots around Decayer.',{towerRadialEveryAttacks:4,towerRadialCount:6,towerRadialDamagePct:.57}),
      C('Mythic','Dark Orbit Plating','Casting Dark Orbit grants 3300 shield.',{superShield:3300,shieldCap:7600}),
      C('Mythic','Gravity Well','Decay hits pull enemies 76 pixels and slow them for 1 second.',{pull:76,slowMs:1000}),
      C('Legendary','Unbroken Void','Every third hit grants another 1100 shield and 12% Super.',{thirdHitShield:1100,thirdHitSuperCharge:12,shieldCap:8200}),
      C('Exotic','BLACK HOLE ARMOR','Decay Shot perfectly homes, pierces, pulls, and converts 40% damage to shield; Dark Orbit adds 5000 shield.',{sushiAttackHoming:1,sushiAttackHomingRadius:900,sushiAttackPierce:1,pull:105,damageShieldPct:.4,superShield:5000,shieldCap:12000})
    ],
    unopcoloco:[
      C('Epic','Scarf Twice Around','Scarf & Whack repeats twice at 64% damage.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:190,towerAttackEchoDamagePct:.64}),
      C('Epic','Fiesta Reach','The scarf swing gains 70% range and 35% damage.',{sushiAttackRangePct:.7,damagePct:.35}),
      C('Epic','Dance-Floor Shove','Hits knock enemies back 115 pixels.',{knockback:115}),
      C('Mythic','Landing Applause','Every third hit grants 1250 shield and 26% speed.',{thirdHitShield:1250,hitSpeedPct:.26,hitSpeedMs:1900,shieldCap:6000}),
      C('Mythic','Whack Landing Wardrobe','Casting Whack Landing reloads 2 ammo and heals 1800 HP.',{superAmmo:2,superHeal:1800}),
      C('Mythic','Fiesta Padding','Whack Landing grants 2900 shield for the dive.',{superShield:2900,shieldCap:6800}),
      C('Legendary','Never-Ending Dance','A defeat reloads 1.2 ammo and grants 35% speed for 5 seconds.',{killAmmo:1.2,killSpeedPct:.35,killSpeedMs:5000}),
      C('Exotic','WHOLE PARADE WHACK','Every swing echoes three times, creates an eight-way scarf burst, and Whack Landing fully heals ammo plus 4600 shield.',{towerAttackEchoCount:3,towerAttackEchoDelayMs:130,towerAttackEchoDamagePct:.72,towerRadialEveryAttacks:1,towerRadialCount:8,towerRadialDamagePct:.6,superAmmo:3,superShield:4600,shieldCap:9000})
    ],
    dashaholic:[
      C('Epic','Claws Across the Hall','Claw Slash gains 80% range and 28% damage.',{sushiAttackRangePct:.8,damagePct:.28}),
      C('Epic','Double Slash Addiction','Every slash repeats once after 150ms.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:150,towerAttackEchoDamagePct:.7}),
      C('Epic','Momentum Scratch','A hit grants 32% speed for 1.5 seconds.',{hitSpeedPct:.32,hitSpeedMs:1500}),
      C('Mythic','Dash Battery','Every third hit restores 18% Super and 0.35 ammo.',{thirdHitSuperCharge:18,thirdHitAmmo:.35}),
      C('Mythic','Unleash Twice','Casting Unleash the Dashaholic restores 2 ammo and 28% speed for 4 seconds.',{superAmmo:2,superSpeedPct:.28,superSpeedMs:4000}),
      C('Mythic','Crash Padding','Every Super activation grants 2400 shield.',{superShield:2400,shieldCap:6500}),
      C('Legendary','Dash Through Dinner','Damage heals 22%; a defeat heals another 1200 HP.',{lifestealPct:.22,killHeal:1200}),
      C('Exotic','NO BRAKES LEFT','Every slash echoes twice, knocks prey forward, and each Super gives full ammo, 45% speed, and 3800 shield.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:105,towerAttackEchoDamagePct:.78,knockback:135,superAmmo:3,superSpeedPct:.45,superSpeedMs:5200,superShield:3800,shieldCap:8500})
    ],
    trapper:[
      C('Epic','Gate Delivery Arc','Slam Gate gains 75% range and becomes 55% larger.',{sushiAttackRangePct:.75,sushiAttackSizePct:.55}),
      C('Epic','Double-Booked Venue','Every gate throw forks into 2 angled gates.',{sushiAttackForks:2}),
      C('Epic','Closing-Time Pull','Gate hits pull enemies 90 pixels into the trap.',{pull:90}),
      C('Mythic','Slam Gate Afterparty','Impacts splash 31% damage and slow for 1.4 seconds.',{splashDamagePct:.31,splashRadius:180,slowMs:1400}),
      C('Mythic','Sound Fence Expansion','Casting Sound Fence grants 2600 shield and 24% speed.',{superShield:2600,superSpeedPct:.24,superSpeedMs:4200,shieldCap:6500}),
      C('Mythic','Fence Refund Desk','Sound Fence restores 2 ammo and heals 1300 HP.',{superAmmo:2,superHeal:1300}),
      C('Legendary','Backstage Chain Reaction','Gate damage chains 46% to the nearest enemy within 440 pixels.',{chainDamagePct:.46,chainRadius:440}),
      C('Exotic','EVERY EXIT IS A TRAP','Slam Gate triples, pierces and pulls; Sound Fence grants 4300 shield and launches a six-way gate burst.',{sushiAttackForks:2,sushiAttackPierce:1,pull:120,superShield:4300,towerSuperOrbitCount:6,towerSuperOrbitDamagePct:.64,shieldCap:8800})
    ],
    classy:[
      C('Epic','Triple Clef','Note Burst forks into 2 harmony notes.',{sushiAttackForks:2}),
      C('Epic','Concert-Hall Sustain','Notes gain 85% range and grow 40% while traveling.',{sushiAttackRangePct:.85,towerTravelGrowthPct:.4}),
      C('Epic','Bassline Burn','Note hits burn for 1.8 seconds in 2 stacks.',{burnMs:1800,burnStacks:2}),
      C('Mythic','Perfect Tempo Tip','Every third note restores 0.55 ammo and 12% Super.',{thirdHitAmmo:.55,thirdHitSuperCharge:12}),
      C('Mythic','Bass Drop Encore','Bass Drop returns through its lane and reaches 55% farther.',{sushiSuperReturn:1,sushiSuperRangePct:.55}),
      C('Mythic','Green-Room Recovery','Casting Bass Drop heals 2200 HP and grants 18% speed.',{superHeal:2200,superSpeedPct:.18,superSpeedMs:3600}),
      C('Legendary','Standing Ovation','A defeat grants 1 ammo, 1500 healing and 30% speed.',{killAmmo:1,killHeal:1500,killSpeedPct:.3,killSpeedMs:4200}),
      C('Exotic','ENDLESS ENCORE DELUXE','Notes have unlimited range, perfect homing and piercing; Bass Drop splits into four returning movements.',{classyEndlessEncore:1,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    hyperorigin:[
      C('Epic','Origin Crater','Origin Slam becomes 80% larger and deals 24% more damage.',{sushiAttackSizePct:.8,damagePct:.24}),
      C('Epic','Purple Seismic Echo','Every slam repeats once after 280ms.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:280,towerAttackEchoDamagePct:.76}),
      C('Epic','Gravity Origin','Slam hits pull enemies 88 pixels toward the impact.',{pull:88}),
      C('Mythic','Origin Armor','Damage becomes 20% shield with a 6400 cap.',{damageShieldPct:.2,shieldCap:6400}),
      C('Mythic','Purple Unleashed Battery','Casting Purple Unleashed restores all 3 ammo.',{superAmmo:3}),
      C('Mythic','Ascension Plating','Purple Unleashed grants 3600 shield and 20% speed for 5 seconds.',{superShield:3600,superSpeedPct:.2,superSpeedMs:5000,shieldCap:7600}),
      C('Legendary','Third Origin Collapse','Every third hit splashes 48% damage in a 210-pixel crater.',{splashDamagePct:.48,splashRadius:210,thirdHitSuperCharge:7}),
      C('Exotic','ORIGIN OF EVERYTHING','Each slam echoes three times, pulls, pierces, and Purple Unleashed grants 5200 shield plus full ammo.',{towerAttackEchoCount:3,towerAttackEchoDelayMs:150,towerAttackEchoDamagePct:.82,pull:125,sushiAttackPierce:1,superShield:5200,superAmmo:3,shieldCap:10000})
    ],
    bowlin_rida:[
      C('Epic','Greased Bowling Lane','Bowling Burst gains 110% bounce travel.',{sushiAttackBounceRangePct:1.1}),
      C('Epic','Sixteen-Pound Moon','Bowling balls become 72% larger and grow 28% while rolling.',{sushiAttackSizePct:.72,towerTravelGrowthPct:.28}),
      C('Epic','7-10 Splitter','Every ball forks into 2 angled pin-seeking balls.',{sushiAttackForks:2}),
      C('Mythic','Bank-Shot Bruise','Hits knock enemies 84 pixels and chain 25% damage to a neighbor.',{knockback:84,chainDamagePct:.25,chainRadius:280}),
      C('Mythic','Pin Strike Long Alley','Pin Strike gains 70% range and returns down the lane.',{sushiSuperRangePct:.7,sushiSuperReturn:1}),
      C('Mythic','Perfect Game Shoes','Casting Pin Strike grants 34% speed and 1 ammo.',{superSpeedPct:.34,superSpeedMs:4000,superAmmo:1}),
      C('Legendary','Turkey Bonus','Every third hit restores 15% Super and grants 700 shield.',{thirdHitSuperCharge:15,thirdHitShield:700,shieldCap:5200}),
      C('Exotic','COSMIC BOWLING NIGHT','Balls bounce endlessly far, fork three ways and grow; Pin Strike becomes four returning lanes.',{sushiAttackBounceRangePct:5,sushiAttackForks:3,towerTravelGrowthPct:.65,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    money_and_tax:[
      C('Epic','Money Printer Platter','Money mode fires 2 additional waves of coins.',{moneyExtraWaves:2}),
      C('Epic','Center-Coin Stimulus','At full ammo, center coins grow 90% and deal 35% more damage.',{moneyCenterSizePct:.9,moneyCenterDamagePct:.35}),
      C('Epic','Compound Interest Range','Each coin wave travels 55% farther and 25% faster.',{sushiAttackRangePct:.55,sushiAttackSpeedPct:.25}),
      C('Mythic','Refund Check','Every third coin hit restores 0.65 ammo.',{thirdHitAmmo:.65}),
      C('Mythic','Market Crash Spread','Market Crash forks into 2 extra coin lanes.',{sushiSuperForks:2}),
      C('Mythic','Tax Shelter','Casting Market Crash grants 3000 shield and heals 900 HP.',{superShield:3000,superHeal:900,shieldCap:7000}),
      C('Mythic','Smart Money','Money-mode coins steer toward enemies with 45% homing strength.',{moneyCoinHoming:.45,moneyCoinHomingRadius:620}),
      C('Legendary','Hostile Acquisition','Coin hits chain 37% damage and steal 10% Super charge as a direct gain.',{chainDamagePct:.37,chainRadius:350,hitSuperCharge:10}),
      C('Exotic','INFINITE MONEY GLITCH','Money mode fires 6 extra piercing waves with huge center coins; Market Crash becomes four returning lanes.',{moneyExtraWaves:6,moneyCenterSizePct:1.5,moneyCenterDamagePct:.6,sushiAttackPierce:1,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    hunter:[
      C('Epic','Longer Search Warrant','Delay Sweep gains 75% range and 45% width.',{sushiAttackRangePct:.75,sushiAttackSizePct:.45}),
      C('Epic','Second Footprint','Each delayed sweep repeats once at 68% damage.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:420,towerAttackEchoDamagePct:.68}),
      C('Epic','Cornered Prey','Hits pull targets 64 pixels and slow for 1.25 seconds.',{pull:64,slowMs:1250}),
      C('Mythic','Tracker Dividend','Every third tracked hit restores 16% Super.',{thirdHitSuperCharge:16}),
      C('Mythic','I Found Everybody','Casting I Found You grants 40% speed for 4.5 seconds.',{superSpeedPct:.4,superSpeedMs:4500}),
      C('Mythic','Prepared Ambush','I Found You grants 2700 shield and reloads 1 ammo.',{superShield:2700,superAmmo:1,shieldCap:6500}),
      C('Legendary','No Cold Trail','A defeat heals 1800, reloads 0.8 ammo and refreshes the hunt speed.',{killHeal:1800,killAmmo:.8,killSpeedPct:.3,killSpeedMs:4000}),
      C('Exotic','THE MAP IS A FOOTPRINT','Delay Sweep echoes twice, homes and pierces; I Found You grants full ammo, 50% speed and 4300 shield.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:270,towerAttackEchoDamagePct:.75,sushiAttackHoming:.8,sushiAttackHomingRadius:760,sushiAttackPierce:1,superAmmo:3,superSpeedPct:.5,superSpeedMs:5200,superShield:4300,shieldCap:9000})
    ],
    chaird:[
      C('Epic','Couch Delivery','Chair Toss becomes 90% larger and travels 60% farther.',{sushiAttackSizePct:.9,sushiAttackRangePct:.6}),
      C('Epic','Matching Furniture Set','Every throw forks into 2 side chairs.',{sushiAttackForks:2}),
      C('Epic','Sit Down Harder','Chair hits knock enemies back 145 pixels.',{knockback:145}),
      C('Mythic','Splinter Splash','Chair impacts splash 42% damage in a 190-pixel radius.',{splashDamagePct:.42,splashRadius:190}),
      C('Mythic','Chair Spin Cushion','Casting Chair Spin grants 3200 shield.',{superShield:3200,shieldCap:7200}),
      C('Mythic','Office-Chair Wheels','Chair Spin grants 38% speed and 1.5 ammo.',{superSpeedPct:.38,superSpeedMs:3800,superAmmo:1.5}),
      C('Legendary','Furniture Liquidation','A defeat restores 1 ammo and throws 6 chair fragments around Chaird.',{killAmmo:1,towerRadialEveryAttacks:5,towerRadialCount:6,towerRadialDamagePct:.65}),
      C('Exotic','ENTIRE FURNITURE STORE','Every throw is three giant piercing chairs; every attack creates an eight-way splinter burst and Chair Spin grants 4500 shield.',{sushiAttackForks:2,sushiAttackSizePct:1.3,sushiAttackPierce:1,towerRadialEveryAttacks:1,towerRadialCount:8,towerRadialDamagePct:.7,superShield:4500,shieldCap:9200})
    ],
    forest:[
      C('Epic','Ancient Branch','Nature’s Wrath gains 70% range and grows 46% while flying.',{sushiAttackRangePct:.7,towerTravelGrowthPct:.46}),
      C('Epic','Three-Branch Canopy','Every nature shot forks into 3 leafy branches.',{sushiAttackForks:3}),
      C('Epic','Root Snare','Hits pull enemies 48 pixels and slow for 1.7 seconds.',{pull:48,slowMs:1700}),
      C('Mythic','Sap Transfer','Damage heals Forest for 21% and grants 10% as shield.',{lifestealPct:.21,damageShieldPct:.1,shieldCap:5400}),
      C('Mythic','Avian Migration','Avian Ally’s cast reaches 65% farther and grants 25% speed.',{sushiSuperRangePct:.65,superSpeedPct:.25,superSpeedMs:4200}),
      C('Mythic','Nest Armor','Summoning Avian Ally grants 2800 shield and heals 1000 HP.',{superShield:2800,superHeal:1000,shieldCap:6700}),
      C('Legendary','Forest Firebreak','Every third hit splashes 33% damage and restores 11% Super.',{thirdHitSuperCharge:11,splashDamagePct:.33,splashRadius:175}),
      C('Exotic','THE FOREST WALKS BACK','Nature’s Wrath is triple, homing and piercing; Avian Ally grants full ammo, 4200 shield and a six-way leaf storm.',{sushiAttackForks:3,sushiAttackHoming:.85,sushiAttackHomingRadius:780,sushiAttackPierce:1,superAmmo:3,superShield:4200,towerSuperOrbitCount:6,towerSuperOrbitDamagePct:.66,shieldCap:8800})
    ],
    goonbob:[
      C('Epic','Goo Garden Hose','Gooey Splatter gains 65% range and becomes 70% larger.',{sushiAttackRangePct:.65,sushiAttackSizePct:.7}),
      C('Epic','Triple Glob','Every goo shot forks into 2 sticky globs.',{sushiAttackForks:2}),
      C('Epic','Elastic Goo','Globs bounce with 160% extra travel and slow for 1.3 seconds.',{sushiAttackBounceRangePct:1.6,slowMs:1300}),
      C('Mythic','Blob Food','Goo damage heals Goonbob for 24%.',{lifestealPct:.24}),
      C('Mythic','Jar Padding','Throwing Blobert Jar grants 2500 shield and reloads 1 ammo.',{superShield:2500,superAmmo:1,shieldCap:6200}),
      C('Mythic','Jar With Splash Damage','Super projectiles become 85% larger and chain 31% damage.',{sushiSuperSizePct:.85,chainDamagePct:.31,chainRadius:320}),
      C('Legendary','Goo Multiplication','Every fourth attack launches 7 globs around Goonbob.',{towerRadialEveryAttacks:4,towerRadialCount:7,towerRadialDamagePct:.59}),
      C('Exotic','BLOBERT FAMILY REUNION','Every attack fires three enormous piercing globs; Blobert Jar grants 4400 shield and launches eight goo globs around you.',{sushiAttackForks:2,sushiAttackSizePct:1.2,sushiAttackPierce:1,superShield:4400,towerSuperOrbitCount:8,towerSuperOrbitDamagePct:.63,shieldCap:9000})
    ],
    tempo_maker:[
      C('Epic','Four-Beat Cadence','Twin Cadence echoes twice to create a four-beat attack.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:210,towerAttackEchoDamagePct:.63}),
      C('Epic','Wide Metronome','Cadence projectiles become 52% larger and travel 50% farther.',{sushiAttackSizePct:.52,sushiAttackRangePct:.5}),
      C('Epic','Syncopated Fork','Every cadence forks into 2 off-beat notes.',{sushiAttackForks:2}),
      C('Mythic','Keep the Rhythm','Every third hit reloads 0.55 ammo and grants 23% speed.',{thirdHitAmmo:.55,hitSpeedPct:.23,hitSpeedMs:2100}),
      C('Mythic','Tempo Break Reprise','Tempo Break returns and reaches 50% farther.',{sushiSuperReturn:1,sushiSuperRangePct:.5}),
      C('Mythic','Conductor’s Guard','Casting Tempo Break grants 2750 shield and heals 900 HP.',{superShield:2750,superHeal:900,shieldCap:6600}),
      C('Legendary','Accelerando','Every hit grants 7% Super; defeats reload 0.75 ammo.',{hitSuperCharge:7,killAmmo:.75}),
      C('Exotic','NO FINAL BEAT','Twin Cadence echoes three times, forks and pierces; Tempo Break becomes four returning movements with full ammo.',{towerAttackEchoCount:3,towerAttackEchoDelayMs:135,towerAttackEchoDamagePct:.71,sushiAttackForks:2,sushiAttackPierce:1,sushiSuperForks:3,sushiSuperReturn:1,superAmmo:3})
    ],
    overlord:[
      C('Epic','Royal Impact Decree','Royal Impact becomes 75% larger and deals 27% more damage.',{sushiAttackSizePct:.75,damagePct:.27}),
      C('Epic','Double Taxation','Every impact echoes once after 240ms.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:240,towerAttackEchoDamagePct:.73}),
      C('Epic','Kneel Before Knockback','Hits knock enemies 118 pixels away.',{knockback:118}),
      C('Mythic','Crown Treasury','Damage dealt becomes 22% shield with a 7200 cap.',{damageShieldPct:.22,shieldCap:7200}),
      C('Mythic','Ascension Throne','Casting Ascension grants 3800 shield and heals 1200 HP.',{superShield:3800,superHeal:1200,shieldCap:8200}),
      C('Mythic','Royal Sprint','Ascension grants 42% speed and full ammo.',{superSpeedPct:.42,superSpeedMs:5000,superAmmo:3}),
      C('Legendary','Conqueror’s Dividend','A defeat heals 2200 HP, grants 1400 shield and 1 ammo.',{killHeal:2200,killShield:1400,killAmmo:1,shieldCap:8500}),
      C('Exotic','ABSOLUTE MONARCHY','Royal Impact echoes three times, pulls enemies inward and converts 40% damage to shield; Ascension grants 5600 shield.',{towerAttackEchoCount:3,towerAttackEchoDelayMs:145,towerAttackEchoDamagePct:.8,pull:110,damageShieldPct:.4,superShield:5600,shieldCap:12500})
    ],
    copyphase:[
      C('Epic','Phase Extension','Phase Orb gains 80% range and 40% speed.',{sushiAttackRangePct:.8,sushiAttackSpeedPct:.4}),
      C('Epic','Duplicate Orb','Every Phase Orb forks into 2 copies.',{sushiAttackForks:2}),
      C('Epic','Copied Trajectory','Phase Orb returns through enemies after reaching maximum range.',{sushiAttackReturn:1}),
      C('Mythic','Borrowed Shield Code','Damage becomes 18% shield and every third hit adds 700 more.',{damageShieldPct:.18,thirdHitShield:700,shieldCap:6500}),
      C('Mythic','Phase Theft Refund','Casting Phase Theft restores 2 ammo and heals 1400 HP.',{superAmmo:2,superHeal:1400}),
      C('Mythic','Safe Copy Buffer','Phase Theft grants 3100 shield and 20% speed.',{superShield:3100,superSpeedPct:.2,superSpeedMs:4400,shieldCap:7200}),
      C('Legendary','Copied Kill File','A defeat restores 1 ammo, 14% Super and 1700 HP.',{killAmmo:1,killSuperCharge:14,killHeal:1700}),
      C('Exotic','COPY THE WHOLE SERVER','Phase Orb triples, perfectly homes, pierces and returns; Phase Theft grants full ammo and 5000 shield.',{sushiAttackForks:2,sushiAttackHoming:1,sushiAttackHomingRadius:1000,sushiAttackPierce:1,sushiAttackReturn:1,superAmmo:3,superShield:5000,shieldCap:10500})
    ],
    fightnfire:[
      C('Epic','Firework Bouquet','Firework Shot forks into 3 colorful rockets.',{sushiAttackForks:3}),
      C('Epic','Skyrocket Fuse','Fireworks fly 48% faster and 60% farther.',{sushiAttackSpeedPct:.48,sushiAttackRangePct:.6}),
      C('Epic','Roman-Candle Burn','Hits burn for 2.4 seconds in 3 stacks.',{burnMs:2400,burnStacks:3}),
      C('Mythic','Firework Aftershock','Impacts splash 40% damage in a 185-pixel blast.',{splashDamagePct:.4,splashRadius:185}),
      C('Mythic','Firestorm Shelter','Casting Firestorm grants 2600 shield and heals 1300 HP.',{superShield:2600,superHeal:1300,shieldCap:6600}),
      C('Mythic','Firestorm Crosswind','Super projectiles fork twice and gain 55% range.',{sushiSuperForks:2,sushiSuperRangePct:.55}),
      C('Legendary','Grand Finale Reload','Every third burning hit restores 13% Super and 0.45 ammo.',{thirdHitSuperCharge:13,thirdHitAmmo:.45}),
      C('Exotic','FIREWORK FACTORY ACCIDENT','Every attack fires five piercing fireworks and leaves a burning wake; Firestorm becomes four returning lanes.',{sushiAttackForks:3,sushiAttackPierce:1,towerTrailDamagePct:.3,towerTrailRadius:84,towerTrailEveryMs:280,burnMs:3000,burnStacks:4,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    beast:[
      C('Epic','Four-Claw Swipe','Twin Claws repeats once for a four-claw combo.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:160,towerAttackEchoDamagePct:.75}),
      C('Epic','Longer Fangs','Claw reach grows 65% and damage rises 22%.',{sushiAttackRangePct:.65,damagePct:.22}),
      C('Epic','Predatory Healing','Claw damage heals Beast for 27%.',{lifestealPct:.27}),
      C('Mythic','Feral Shove','Hits knock enemies back 96 pixels and grant 18% speed.',{knockback:96,hitSpeedPct:.18,hitSpeedMs:2000}),
      C('Mythic','Unleash Armor','Casting Unleash the Beast grants 3400 shield.',{superShield:3400,shieldCap:7600}),
      C('Mythic','Full Feral Magazine','Transformation restores all ammo and grants 35% speed.',{superAmmo:3,superSpeedPct:.35,superSpeedMs:4800}),
      C('Legendary','Fresh Prey','A defeat heals 2400 HP and grants 40% speed for 4 seconds.',{killHeal:2400,killSpeedPct:.4,killSpeedMs:4000}),
      C('Exotic','BEAST NEVER TURNS OFF','Claws echo twice, heal 40% and knock back; transforming grants full ammo, 4800 shield and 50% speed.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:100,towerAttackEchoDamagePct:.82,lifestealPct:.4,knockback:120,superAmmo:3,superShield:4800,superSpeedPct:.5,superSpeedMs:6000,shieldCap:9800})
    ],
    amplifier:[
      C('Epic','Longer Ampifin Cable','Ampifin gains 70% range and 50% size.',{sushiAttackRangePct:.7,sushiAttackSizePct:.5}),
      C('Epic','Twin Tool Heads','Every tool shot forks into 2 angled copies.',{sushiAttackForks:2}),
      C('Epic','Magnetic Screws','Hits pull enemies 70 pixels toward the tool.',{pull:70}),
      C('Mythic','Toolbox Feedback','Damage grants 19% shield and every third hit restores 9% Super.',{damageShieldPct:.19,thirdHitSuperCharge:9,shieldCap:6200}),
      C('Mythic','Screws and Nuts Reserve','Casting Screws and Nuts restores 2 ammo and grants 2100 shield.',{superAmmo:2,superShield:2100,shieldCap:6500}),
      C('Mythic','Oversized Hardware','Super projectiles become 95% larger and reach 60% farther.',{sushiSuperSizePct:.95,sushiSuperRangePct:.6}),
      C('Legendary','Machine Chain','Tool damage chains 43% within 400 pixels.',{chainDamagePct:.43,chainRadius:400}),
      C('Exotic','AMPLIFY EVERYTHING','Ampifin triples, pierces and homes; Screws and Nuts returns through four lanes and grants 4200 shield.',{sushiAttackForks:2,sushiAttackPierce:1,sushiAttackHoming:.9,sushiAttackHomingRadius:820,sushiSuperForks:3,sushiSuperReturn:1,superShield:4200,shieldCap:9000})
    ],
    crystila:[
      C('Epic','Prismatic Arms','Crystal Arms forks into 3 colored shards.',{sushiAttackForks:3}),
      C('Epic','Cathedral Crystal','Crystal projectiles become 80% larger and gain 45% range.',{sushiAttackSizePct:.8,sushiAttackRangePct:.45}),
      C('Epic','Reflective Return','Every crystal returns through its original lane.',{sushiAttackReturn:1}),
      C('Mythic','Shard Shield','Damage becomes 21% shield with a 6800 cap.',{damageShieldPct:.21,shieldCap:6800}),
      C('Mythic','Overreflect Prism','Overreflect forks twice and its projectiles become 65% larger.',{sushiSuperForks:2,sushiSuperSizePct:.65}),
      C('Mythic','Mirror Safety Glass','Casting Overreflect grants 3000 shield and heals 1100 HP.',{superShield:3000,superHeal:1100,shieldCap:7400}),
      C('Legendary','Crystal Chain Refraction','Hits refract 48% damage to the next enemy within 430 pixels.',{chainDamagePct:.48,chainRadius:430}),
      C('Exotic','INFINITE PRISM HALL','Crystal Arms fires five piercing returning shards; Overreflect fires four larger returning lanes and grants 4800 shield.',{sushiAttackForks:3,sushiAttackPierce:1,sushiAttackReturn:1,sushiSuperForks:3,sushiSuperReturn:1,sushiSuperSizePct:1.1,superShield:4800,shieldCap:10000})
    ],
    hope:[
      C('Epic','Hope Reaches Farther','Hopeful Shot gains 80% range and grows 35% in flight.',{sushiAttackRangePct:.8,towerTravelGrowthPct:.35}),
      C('Epic','Three Reasons to Hope','Every shot forks into 2 supportive rays.',{sushiAttackForks:2}),
      C('Epic','Hopeful Recovery','Damage heals Hope for 20%.',{lifestealPct:.2}),
      C('Mythic','Optimism Shield','Every third hit grants 1200 shield and heals 500 HP.',{thirdHitShield:1200,thirdHitHeal:500,shieldCap:6200}),
      C('Mythic','You Broke My Shield','Casting You Broke My Hope grants 3600 shield.',{superShield:3600,shieldCap:7800}),
      C('Mythic','Second Chance Magazine','The Super restores 2 ammo and heals 1800 HP.',{superAmmo:2,superHeal:1800}),
      C('Legendary','Hope Spreads','Hits chain 35% damage while healing Hope for 15%.',{chainDamagePct:.35,chainRadius:380,lifestealPct:.15}),
      C('Exotic','HOPE CANNOT BREAK','Hopeful Shot triples, homes and pierces while converting 35% damage to shield; Super grants 5200 shield and full ammo.',{sushiAttackForks:2,sushiAttackHoming:.9,sushiAttackHomingRadius:850,sushiAttackPierce:1,damageShieldPct:.35,superShield:5200,superAmmo:3,shieldCap:11500})
    ],
    evil_doctor:[
      C('Epic','Triple Dose','Infectious Shot forks into 2 extra syringes.',{sushiAttackForks:2}),
      C('Epic','Long Incubation Needle','Shots gain 75% range and 38% speed.',{sushiAttackRangePct:.75,sushiAttackSpeedPct:.38}),
      C('Epic','Fever Spike','Hits burn as virus damage for 2.2 seconds in 2 stacks.',{burnMs:2200,burnStacks:2}),
      C('Mythic','Contagious Waiting Room','Virus damage chains 52% to a nearby enemy.',{chainDamagePct:.52,chainRadius:420}),
      C('Mythic','Spread My Virus Wider','Super projectiles fork twice and gain 60% range.',{sushiSuperForks:2,sushiSuperRangePct:.6}),
      C('Mythic','Doctor’s Immunity','Casting Spread My Virus grants 2800 shield and heals 1600 HP.',{superShield:2800,superHeal:1600,shieldCap:7000}),
      C('Legendary','Research Funding','Every third infected hit restores 17% Super and 0.4 ammo.',{thirdHitSuperCharge:17,thirdHitAmmo:.4}),
      C('Exotic','GLOBAL OUTBREAK','Infectious Shot fires five homing, piercing doses with four virus stacks; Super becomes four returning infection lanes.',{sushiAttackForks:3,sushiAttackHoming:.85,sushiAttackHomingRadius:800,sushiAttackPierce:1,burnMs:3200,burnStacks:4,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    splitter:[
      C('Epic','First Split Is Free','Split Grenade forks into 2 additional opening grenades.',{sushiAttackForks:2}),
      C('Epic','Longer Family Tree','Every split projectile gains 65% travel range.',{sushiAttackRangePct:.65}),
      C('Epic','Growing Generations','Fragments grow 58% across their flight.',{towerTravelGrowthPct:.58}),
      C('Mythic','Fractal Splash','Every hit splashes 36% damage in a 170-pixel area.',{splashDamagePct:.36,splashRadius:170}),
      C('Mythic','Splitin Off Crossroads','Super projectiles fork into 3 lanes.',{sushiSuperForks:3}),
      C('Mythic','Fractal Refund','Every third fragment hit restores 0.7 ammo.',{thirdHitAmmo:.7}),
      C('Legendary','Infinite Family Reunion','Every fourth attack launches 8 fragments around Splitter.',{towerRadialEveryAttacks:4,towerRadialCount:8,towerRadialDamagePct:.54}),
      C('Exotic','SPLIT INTO SPLIT INTO SPLIT','Main grenades gain the third full generation, pierce, and grow; Super returns through four split lanes.',{splitterExoticCascade:1,sushiAttackPierce:1,towerTravelGrowthPct:.75,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    scuba_diver:[
      C('Epic','Bubble School','Bubble Barrage forks into 3 extra bubbles.',{sushiAttackForks:3}),
      C('Epic','Deep-Sea Pressure','Bubbles become 68% larger and travel 55% farther.',{sushiAttackSizePct:.68,sushiAttackRangePct:.55}),
      C('Epic','Undertow Bubble','Hits pull enemies 68 pixels and slow for 1 second.',{pull:68,slowMs:1000}),
      C('Mythic','Oxygen Recycling','Bubble damage heals 19%; every third hit restores 0.45 ammo.',{lifestealPct:.19,thirdHitAmmo:.45}),
      C('Mythic','Dash Underwater Reserve','Casting Dash Underwater reloads 2 ammo and grants 35% speed.',{superAmmo:2,superSpeedPct:.35,superSpeedMs:3800}),
      C('Mythic','Pressure-Suit Shield','The underwater dash grants 3000 shield.',{superShield:3000,shieldCap:7000}),
      C('Legendary','Bubble Current Chain','Bubble damage chains 39% through enemies within 390 pixels.',{chainDamagePct:.39,chainRadius:390}),
      C('Exotic','BOTTOM OF THE OCEAN','Bubble Barrage fires five homing, piercing bubbles; every dash grants full ammo, 4700 shield and 50% speed.',{sushiAttackForks:3,sushiAttackHoming:.85,sushiAttackHomingRadius:760,sushiAttackPierce:1,superAmmo:3,superShield:4700,superSpeedPct:.5,superSpeedMs:5200,shieldCap:9800})
    ],
    hoop:[
      C('Epic','Full-Court Bank','Bounce Breaker gains 220% bounce travel.',{sushiAttackBounceRangePct:2.2}),
      C('Epic','Giant Basketball','The ball becomes 90% larger and grows 24% in flight.',{sushiAttackSizePct:.9,towerTravelGrowthPct:.24}),
      C('Epic','Three-Point Split','Every ball forks into 2 angled bank shots.',{sushiAttackForks:2}),
      C('Mythic','Poster Dunk Knockback','Ball hits knock enemies 105 pixels and grant 20% speed.',{knockback:105,hitSpeedPct:.2,hitSpeedMs:1800}),
      C('Mythic','Full-Court Crash Pad','Casting Full-Court Crash grants 3200 shield.',{superShield:3200,shieldCap:7300}),
      C('Mythic','Fast Break','The Super restores 2 ammo and grants 40% speed.',{superAmmo:2,superSpeedPct:.4,superSpeedMs:4200}),
      C('Legendary','Heat Check Refund','Every third bank hit restores 16% Super and 0.6 ammo.',{thirdHitSuperCharge:16,thirdHitAmmo:.6}),
      C('Exotic','INFINITE OVERTIME','Balls bounce absurdly far, triple, pierce and grow; Full-Court Crash grants full ammo and 5000 shield.',{sushiAttackBounceRangePct:5,sushiAttackForks:2,sushiAttackPierce:1,towerTravelGrowthPct:.7,superAmmo:3,superShield:5000,shieldCap:10200})
    ],
    screener:[
      C('Epic','Widescreen Sweep','Projected Sweep becomes 95% wider and 40% longer.',{sushiAttackSizePct:.95,sushiAttackRangePct:.4}),
      C('Epic','Second Projection','Every sweep echoes once after 230ms.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:230,towerAttackEchoDamagePct:.7}),
      C('Epic','Screen Push','Hits knock enemies 100 pixels away from the projected panel.',{knockback:100}),
      C('Mythic','Pixel Burn-In','Hits burn for 1.9 seconds and chain 24% damage.',{burnMs:1900,burnStacks:2,chainDamagePct:.24,chainRadius:270}),
      C('Mythic','Projected Charge Glass','Casting Projected Charge grants 2900 shield.',{superShield:2900,shieldCap:6900}),
      C('Mythic','Refresh-Rate Rush','Projected Charge restores 2 ammo and grants 36% speed.',{superAmmo:2,superSpeedPct:.36,superSpeedMs:4000}),
      C('Legendary','Dead-Pixel Burst','Every fourth attack creates an eight-way pixel burst.',{towerRadialEveryAttacks:4,towerRadialCount:8,towerRadialDamagePct:.58}),
      C('Exotic','IMAX COMBAT MODE','Projected Sweep echoes three times, fills a giant piercing screen, and Projected Charge grants 4500 shield plus full ammo.',{towerAttackEchoCount:3,towerAttackEchoDelayMs:140,towerAttackEchoDamagePct:.76,sushiAttackSizePct:1.5,sushiAttackPierce:1,superShield:4500,superAmmo:3,shieldCap:9500})
    ],
    malakor:[
      C('Epic','Hell Reaches Up','Putting You Down gains 70% range and 30% damage.',{sushiAttackRangePct:.7,damagePct:.3}),
      C('Epic','Second Damnation','Each infernal hit echoes once after 170ms.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:170,towerAttackEchoDamagePct:.77}),
      C('Epic','Stay in Hell','Hits pull enemies 95 pixels inward and slow for 1.2 seconds.',{pull:95,slowMs:1200}),
      C('Mythic','Pain Feeds Pain','Damage heals Malakor for 25%.',{lifestealPct:.25}),
      C('Mythic','Hell Is Armored','Casting Hell Is Forever grants 3500 shield.',{superShield:3500,shieldCap:7800}),
      C('Mythic','Forever Is Fast','The Super grants 42% speed and restores 1.5 ammo.',{superSpeedPct:.42,superSpeedMs:4500,superAmmo:1.5}),
      C('Legendary','Infernal Finish','A defeat heals 2300 HP and restores 18% Super.',{killHeal:2300,killSuperCharge:18}),
      C('Exotic','HELL ACTUALLY IS FOREVER','Every hit echoes twice, pulls and heals 40%; the Super grants full ammo, 5200 shield and 55% speed.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:100,towerAttackEchoDamagePct:.84,pull:125,lifestealPct:.4,superAmmo:3,superShield:5200,superSpeedPct:.55,superSpeedMs:6000,shieldCap:10800})
    ],
    beam:[
      C('Epic','Longer Focus Lens','Focus Beam gains 85% range and 30% width.',{sushiAttackRangePct:.85,sushiAttackSizePct:.3}),
      C('Epic','Split Prism','The beam forks into 2 side rays.',{sushiAttackForks:2}),
      C('Epic','Heat the Lens','Beam hits burn for 2 seconds in 3 stacks.',{burnMs:2000,burnStacks:3}),
      C('Mythic','Sustained Focus','Every third beam hit restores 0.5 ammo and 10% Super.',{thirdHitAmmo:.5,thirdHitSuperCharge:10}),
      C('Mythic','Golden Beam Array','Golden Beam forks into 3 giant rays.',{sushiSuperForks:3,sushiSuperSizePct:.55}),
      C('Mythic','Prism Guard','Casting Golden Beam grants 2700 shield and heals 1300 HP.',{superShield:2700,superHeal:1300,shieldCap:6800}),
      C('Legendary','Refraction Chain','Beam damage chains 45% within 460 pixels.',{chainDamagePct:.45,chainRadius:460}),
      C('Exotic','SUNLIGHT THROUGH A MAGNIFYING GLASS','Focus Beam becomes five piercing homing rays with four burn stacks; Golden Beam returns through four lanes.',{sushiAttackForks:3,sushiAttackPierce:1,sushiAttackHoming:.8,sushiAttackHomingRadius:850,burnMs:3000,burnStacks:4,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    paradox:[
      C('Epic','Longer Timeline','Temporal Skip gains 80% range and 40% speed.',{sushiAttackRangePct:.8,sushiAttackSpeedPct:.4}),
      C('Epic','Parallel Shot','Every temporal projectile forks into 2 alternate timelines.',{sushiAttackForks:2}),
      C('Epic','Rewind Projectile','Attacks return through the timeline after max range.',{sushiAttackReturn:1}),
      C('Mythic','Time Theft','Hits slow for 1.4 seconds and restore 8% Super.',{slowMs:1400,hitSuperCharge:8}),
      C('Mythic','Relativity Bubble','Casting Relativity Zone grants 3000 shield and 25% speed.',{superShield:3000,superSpeedPct:.25,superSpeedMs:4500,shieldCap:7200}),
      C('Mythic','Borrowed Seconds','The Super restores 2 ammo and heals 1600 HP.',{superAmmo:2,superHeal:1600}),
      C('Legendary','Timeline Collapse','Every third hit splashes 43% damage in a 200-pixel time fracture.',{splashDamagePct:.43,splashRadius:200,thirdHitSuperCharge:6}),
      C('Exotic','EVERY TIMELINE AT ONCE','Temporal Skip fires five homing, piercing, returning shots; Relativity Zone grants full ammo, 4800 shield and 45% speed.',{sushiAttackForks:3,sushiAttackHoming:.9,sushiAttackHomingRadius:900,sushiAttackPierce:1,sushiAttackReturn:1,superAmmo:3,superShield:4800,superSpeedPct:.45,superSpeedMs:5500,shieldCap:10000})
    ],
    sera_eclipse:[
      C('Epic','Larger Eclipse','Eclipse Flare becomes 78% larger and travels 50% farther.',{sushiAttackSizePct:.78,sushiAttackRangePct:.5}),
      C('Epic','Three-Body Flare','Every flare forks into 2 orbiting copies.',{sushiAttackForks:2}),
      C('Epic','Return to Orbit','Flares return through their original arc.',{sushiAttackReturn:1}),
      C('Mythic','Corona Drain','Flare damage heals Sera for 22% and slows enemies for 1 second.',{lifestealPct:.22,slowMs:1000}),
      C('Mythic','Eclipse Orbit Expansion','Super projectiles gain 85% range and 60% size.',{sushiSuperRangePct:.85,sushiSuperSizePct:.6}),
      C('Mythic','Umbra Shield','Casting Eclipse Orbit grants 3200 shield.',{superShield:3200,shieldCap:7500}),
      C('Legendary','Solar Chain','Flare hits chain 47% damage through a 420-pixel corona.',{chainDamagePct:.47,chainRadius:420}),
      C('Exotic','TOTAL ECLIPSE FOREVER','Flares become five piercing returning moons; Eclipse Orbit becomes four giant returning lanes and grants 4700 shield.',{sushiAttackForks:3,sushiAttackPierce:1,sushiAttackReturn:1,sushiSuperForks:3,sushiSuperReturn:1,sushiSuperSizePct:1.25,superShield:4700,shieldCap:9800})
    ],
    teether:[
      C('Epic','Second Row of Teeth','Bite Pattern adds a fourth delayed row with 3 wide teeth.',{teetherExtraToothWave:1}),
      C('Epic','Dental-Floss Longline','Floss Line gains 55% range and a larger enemy lock.',{teetherFlossRangePct:.55,teetherLockRadius:70}),
      C('Epic','Molar Megaphone','Every tooth becomes 65% larger and knocks enemies 35 pixels.',{sushiAttackSizePct:.65,knockback:35}),
      C('Mythic','Floss Refund','Every third tooth hit restores 0.6 ammo and 9% Super.',{thirdHitAmmo:.6,thirdHitSuperCharge:9}),
      C('Mythic','Tooth Fairy Flight Plan','Super teeth fork twice and gain 55% range.',{sushiSuperForks:2,sushiSuperRangePct:.55}),
      C('Mythic','Floss Safety Harness','Casting Tooth Fairy grants 3000 shield and 25% speed.',{superShield:3000,superSpeedPct:.25,superSpeedMs:4200,shieldCap:7200}),
      C('Legendary','Cavity Chain','Tooth hits chain 41% damage and slow for 1.3 seconds.',{chainDamagePct:.41,chainRadius:360,slowMs:1300}),
      C('Exotic','EVERY TOOTH IN THE MOUTH','Bite Pattern gains 3 extra waves with giant piercing teeth; Tooth Fairy fires four returning tooth lanes and grants 4500 shield.',{teetherExtraToothWave:3,sushiAttackSizePct:1.1,sushiAttackPierce:1,sushiSuperForks:3,sushiSuperReturn:1,superShield:4500,shieldCap:9400})
    ],
    fuel:[
      C('Epic','Six-Finger Cycle','The flame cycle continues to 5 and 6 before resetting.',{fuelCycleMax:6}),
      C('Epic','Ten-Second Stove','Five Flame Finger lasts 6.75 extra seconds.',{fuelSuperBonusMs:6750}),
      C('Epic','Narrow Blowtorch','Flames gain 60% range, 40% speed and pierce.',{sushiAttackRangePct:.6,sushiAttackSpeedPct:.4,sushiAttackPierce:1}),
      C('Mythic','Grease Fire','Flame hits burn for 2.8 seconds in 4 stacks.',{burnMs:2800,burnStacks:4}),
      C('Mythic','Five-Finger Fork','Super flames fork into 2 tighter side lanes.',{sushiSuperForks:2}),
      C('Mythic','Heatproof Apron','Casting Five Flame Finger grants 2900 shield and heals 1100 HP.',{superShield:2900,superHeal:1100,shieldCap:7100}),
      C('Legendary','Combustion Chain','Flame damage chains 42% within 370 pixels.',{chainDamagePct:.42,chainRadius:370}),
      C('Exotic','TOO MANY FINGERS','Every attack fires six piercing homing flames with five burn stacks; Super becomes four returning blowtorches.',{fuelCycleMax:6,sushiAttackForks:3,sushiAttackPierce:1,sushiAttackHoming:.75,sushiAttackHomingRadius:700,burnMs:3600,burnStacks:5,sushiSuperForks:3,sushiSuperReturn:1})
    ],
    xray:[
      C('Epic','Full-Penetration Plate','Infrared Reading pierces and grows 45% wider.',{xrayPierce:1,sushiAttackSizePct:.45}),
      C('Epic','Lead-Lined Machine','The X-ray machine gains 60% HP and stops decaying.',{xrayMachineHpPct:.6,xrayNoDecay:1}),
      C('Epic','Long Exposure','Infrared Reading gains 85% range and mild homing.',{sushiAttackRangePct:.85,sushiAttackHoming:.35,sushiAttackHomingRadius:600}),
      C('Mythic','Radiation Chain','Hits chain 36% damage and slow for 1.2 seconds.',{chainDamagePct:.36,chainRadius:410,slowMs:1200}),
      C('Mythic','Portable Scanner Battery','Casting Full Body Scan restores 2 ammo and grants 2500 shield.',{superAmmo:2,superShield:2500,shieldCap:6600}),
      C('Mythic','Panoramic Scan','Super projectiles gain 100% range and 75% size.',{sushiSuperRangePct:1,sushiSuperSizePct:.75}),
      C('Legendary','Diagnostic Refund','Every third revealed hit restores 14% Super and heals 650 HP.',{thirdHitSuperCharge:14,thirdHitHeal:650}),
      C('Exotic','SEE THROUGH EVERYTHING','Infrared Reading is map-wide, perfectly homing and piercing; Full Body Scan grants full ammo and 4600 shield.',{sushiAttackRangePct:2,sushiAttackHoming:1,sushiAttackHomingRadius:2400,sushiAttackPierce:1,superAmmo:3,superShield:4600,shieldCap:9600})
    ],
    angel:[
      C('Epic','Three-Ray Halo','Guiding Light always fires 3 rays in quick succession.',{angelExtraBurst:2}),
      C('Epic','Everyone Gets Another Life','Second Life protects the entire living team.',{angelSuperTeam:1}),
      C('Epic','Cathedral Light','Guiding Light gains 75% range and 48% size.',{sushiAttackRangePct:.75,sushiAttackSizePct:.48}),
      C('Mythic','Merciful Beam','Damage heals Angel for 23%; every third hit heals another 600.',{lifestealPct:.23,thirdHitHeal:600}),
      C('Mythic','Second-Life Plating','Casting Second Life grants 3400 shield.',{superShield:3400,shieldCap:7800}),
      C('Mythic','Resurrection Magazine','Second Life restores full ammo and heals 1500 HP.',{superAmmo:3,superHeal:1500}),
      C('Legendary','Halo Chain','Guiding Light chains 40% to another enemy and grants 12% Super every third hit.',{chainDamagePct:.4,chainRadius:430,thirdHitSuperCharge:12}),
      C('Exotic','WHOLE TEAM ASCENDS','Guiding Light fires five homing, piercing rays; Second Life grants the team effect, full ammo and 5200 shield.',{angelExtraBurst:4,sushiAttackHoming:.9,sushiAttackHomingRadius:850,sushiAttackPierce:1,angelSuperTeam:1,superAmmo:3,superShield:5200,shieldCap:11000})
    ],
    demon:[
      C('Epic','Twin Hellblades','Every main attack throws a second spectral blade.',{demonExtraBlade:1}),
      C('Epic','Longer Temptation','The glide decision window lasts 2.5 seconds.',{demonGlideBonusMs:1500}),
      C('Epic','Abyssal Throw','Hellblade gains 70% range and becomes 52% larger.',{sushiAttackRangePct:.7,sushiAttackSizePct:.52}),
      C('Mythic','Blade Lifeline','Hellblade damage heals Demon for 24% and restores 0.3 ammo every third hit.',{lifestealPct:.24,thirdHitAmmo:.3}),
      C('Mythic','Demonic Doom Array','Super blades fork twice and return through their pull lanes.',{sushiSuperForks:2,sushiSuperReturn:1}),
      C('Mythic','Doom Shield','Casting Demonic Doom grants 3600 shield.',{superShield:3600,shieldCap:7900}),
      C('Legendary','Dragged to the Abyss','Blade hits pull 105 pixels and restore 13% Super every third hit.',{pull:105,thirdHitSuperCharge:13}),
      C('Exotic','HELLBLADE ARMORY','Every attack fires four homing, piercing blades with a long glide window; Doom returns through four lanes and grants 5200 shield.',{demonExtraBlade:3,demonGlideBonusMs:2600,sushiAttackHoming:.85,sushiAttackHomingRadius:800,sushiAttackPierce:1,sushiSuperForks:3,sushiSuperReturn:1,superShield:5200,shieldCap:10600})
    ],
    warrior:[
      C('Epic','Four-Spear Formation','Normal attacks throw 4 spears instead of 2.',{warriorExtraSpears:2}),
      C('Epic','Explosive Tips','Normal spear landings explode for area damage.',{warriorExplosiveMain:1}),
      C('Epic','Long Phalanx','Spears gain 65% range and 35% projectile speed.',{sushiAttackRangePct:.65,sushiAttackSpeedPct:.35}),
      C('Mythic','Spear Wall','Every third hit grants 1400 shield and restores 0.35 ammo.',{thirdHitShield:1400,thirdHitAmmo:.35,shieldCap:6500}),
      C('Mythic','Final Stand Reserve','Casting Final Stand restores full ammo.',{superAmmo:3}),
      C('Mythic','Phalanx Armor','Final Stand grants 3800 shield and 18% speed.',{superShield:3800,superSpeedPct:.18,superSpeedMs:5000,shieldCap:8200}),
      C('Legendary','Piercing Formation','All spears pierce and hits chain 28% damage.',{sushiAttackPierce:1,chainDamagePct:.28,chainRadius:310}),
      C('Exotic','ONE-PERSON ARMY','Normal attacks throw 8 explosive piercing spears; Final Stand restores full ammo, grants 5200 shield and fires four returning lanes.',{warriorExtraSpears:6,warriorExplosiveMain:1,sushiAttackPierce:1,superAmmo:3,superShield:5200,sushiSuperForks:3,sushiSuperReturn:1,shieldCap:10800})
    ],
    relay:[
      C('Epic','Overcharged Signal','Shield Signal grants 75% more shield with a 12000 cap.',{relayShieldPct:.75,relayShieldCap:12000}),
      C('Epic','Industrial Relay','The device gains 75% HP and 65% connection radius.',{relayDeviceHpPct:.75,relayLinkRadiusPct:.65}),
      C('Epic','Long-Bandwidth Orb','Shield Signal gains 70% range and 55% size.',{sushiAttackRangePct:.7,sushiAttackSizePct:.55}),
      C('Mythic','Signal Splitter','Every orb forks into 2 relay signals.',{sushiAttackForks:2}),
      C('Mythic','Move My Ammo','Casting Move My Damage restores 2 ammo and grants 2200 shield.',{superAmmo:2,superShield:2200,shieldCap:7000}),
      C('Mythic','Damage Dividend','Damage dealt converts 27% into Relay shield.',{damageShieldPct:.27,shieldCap:9000}),
      C('Legendary','Emergency Bandwidth','Every third hit grants 1200 shield and heals 700 HP.',{thirdHitShield:1200,thirdHitHeal:700,shieldCap:9500}),
      C('Exotic','THE WHOLE TEAM IS A RELAY','Shield Signal fires five homing, piercing orbs; the device gains huge range, and every Super grants 5200 shield plus full ammo.',{sushiAttackForks:3,sushiAttackHoming:.85,sushiAttackHomingRadius:800,sushiAttackPierce:1,relayDeviceHpPct:1.5,relayLinkRadiusPct:1.2,superShield:5200,superAmmo:3,shieldCap:14000})
    ],
    upiedown:[
      C('Epic','Pie Gets Another Slice','Pie in the Sky forks into 2 extra thrown pies.',{sushiAttackForks:2}),
      C('Epic','Long-Distance Bakery','Pies gain 70% range and become 60% larger.',{sushiAttackRangePct:.7,sushiAttackSizePct:.6}),
      C('Epic','Sticky Filling','Pie hits slow for 1.5 seconds and splash 30% damage.',{slowMs:1500,splashDamagePct:.3,splashRadius:165}),
      C('Mythic','Second Dessert','Every pie repeats once at 62% damage.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:330,towerAttackEchoDamagePct:.62}),
      C('Mythic','Upside-Down Bigger Pie','Super projectiles gain 95% size and 55% range.',{sushiSuperSizePct:.95,sushiSuperRangePct:.55}),
      C('Mythic','Oven Mitt Armor','Casting Upside-Down Pie grants 2800 shield and heals 1100 HP.',{superShield:2800,superHeal:1100,shieldCap:7000}),
      C('Legendary','Pie Chain Bakery','Hits chain 43% damage and every third restores 12% Super.',{chainDamagePct:.43,chainRadius:380,thirdHitSuperCharge:12}),
      C('Exotic','THE MAP IS PIE','Every attack fires five giant piercing pies that echo; Super becomes four returning blueberry lanes and grants 4300 shield.',{sushiAttackForks:3,sushiAttackSizePct:1.2,sushiAttackPierce:1,towerAttackEchoCount:1,towerAttackEchoDelayMs:190,towerAttackEchoDamagePct:.74,sushiSuperForks:3,sushiSuperReturn:1,superShield:4300,shieldCap:9200})
    ],
    chickpig:[
      C('Epic','Breakfast Platter','Breakfast Blast forks into 2 extra egg-and-bacon lanes.',{sushiAttackForks:2}),
      C('Epic','Long-Range Brunch','Egg and bacon gain 65% range and 45% size.',{sushiAttackRangePct:.65,sushiAttackSizePct:.45}),
      C('Epic','Extra-Crispy Bacon','Hits burn for 2 seconds and slow for 0.8 seconds.',{burnMs:2000,burnStacks:2,slowMs:800}),
      C('Mythic','Breakfast Lifesteal','Damage heals Chickpig for 20%; every third hit restores 0.4 ammo.',{lifestealPct:.2,thirdHitAmmo:.4}),
      C('Mythic','Farmyard Rush Armor','Casting Farmyard Rush grants 3000 shield and 30% speed.',{superShield:3000,superSpeedPct:.3,superSpeedMs:4500,shieldCap:7200}),
      C('Mythic','Double Farm Delivery','Super projectiles fork twice and gain 50% range.',{sushiSuperForks:2,sushiSuperRangePct:.5}),
      C('Legendary','Breakfast Chain','Egg damage chains 38% and bacon knockback increases.',{chainDamagePct:.38,chainRadius:360,knockback:55}),
      C('Exotic','ENTIRE FARM FOR BREAKFAST','Breakfast Blast fires five homing, piercing meals with burn; Farmyard Rush grants full ammo, 4600 shield and four returning lanes.',{sushiAttackForks:3,sushiAttackHoming:.8,sushiAttackHomingRadius:740,sushiAttackPierce:1,burnMs:2800,burnStacks:3,superAmmo:3,superShield:4600,sushiSuperForks:3,sushiSuperReturn:1,shieldCap:9800})
    ],
    jetpack:[
      C('Epic','Higher Flight Ceiling','Crash Landing gains 75% range and a 70% larger impact.',{sushiAttackRangePct:.75,sushiAttackSizePct:.7}),
      C('Epic','Landing Bomb Included','Every landing splashes 45% extra damage around Jetpack.',{splashDamagePct:.45,splashRadius:205}),
      C('Epic','Afterburner Refund','Every third landing restores 0.75 ammo.',{thirdHitAmmo:.75}),
      C('Mythic','Shockwave Landing','Crash Landing knocks enemies 125 pixels and slows for 0.9 seconds.',{knockback:125,slowMs:900}),
      C('Mythic','I Drop More Bombs','Super projectiles fork into 3 bombing lanes.',{sushiSuperForks:3}),
      C('Mythic','Flight Suit Plating','Casting I Drop Bombs grants 3500 shield.',{superShield:3500,shieldCap:7800}),
      C('Legendary','Bombing-Run Refill','The Super restores full ammo and grants 38% speed.',{superAmmo:3,superSpeedPct:.38,superSpeedMs:4800}),
      C('Exotic','AIRSPACE CLOSED','Crash Landing echoes twice with giant knockback craters; the bombing run has four returning lanes, full ammo and 5000 shield.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:180,towerAttackEchoDamagePct:.77,splashDamagePct:.6,splashRadius:250,knockback:150,sushiSuperForks:3,sushiSuperReturn:1,superAmmo:3,superShield:5000,shieldCap:10500})
    ],
    snapper:[
      C('Epic','Perfecter Mark','Marking Orb gains 80% range and mild homing.',{sushiAttackRangePct:.8,sushiAttackHoming:.4,sushiAttackHomingRadius:650}),
      C('Epic','Triple Target Stamp','Every orb forks into 2 extra marks.',{sushiAttackForks:2}),
      C('Epic','Mark Goes Through','The orb pierces and grows 45% while traveling.',{sushiAttackPierce:1,towerTravelGrowthPct:.45}),
      C('Mythic','Marked Refund','Every third marked hit restores 15% Super and 0.35 ammo.',{thirdHitSuperCharge:15,thirdHitAmmo:.35}),
      C('Mythic','Snap Across Two Maps','Snap! gains 100% range and 55% size.',{sushiSuperRangePct:1,sushiSuperSizePct:.55}),
      C('Mythic','Wave-Proof Vest','Casting Snap! grants 3200 shield.',{superShield:3200,shieldCap:7400}),
      C('Legendary','Mark Contagion','Marking damage chains 46% to a nearby enemy.',{chainDamagePct:.46,chainRadius:440}),
      C('Exotic','PERFECTLY MARKED PLANET','Marking Orb fires five perfect homing, piercing stamps; Snap! becomes four returning waves and grants 4700 shield.',{sushiAttackForks:3,sushiAttackHoming:1,sushiAttackHomingRadius:2000,sushiAttackPierce:1,sushiSuperForks:3,sushiSuperReturn:1,superShield:4700,shieldCap:9900})
    ],
    duck:[
      C('Epic','Bottomless Bread Bag','Breadcrumb Stream has a 42% ammo-refund chance on every damaging crumb.',{ammoRefundChance:.42}),
      C('Epic','Wide Crumb Sweep','Crumbs become 55% larger and gain 45% range.',{sushiAttackSizePct:.55,sushiAttackRangePct:.45}),
      C('Epic','Three-Bakery Stream','Every crumb forks into 2 side crumbs.',{sushiAttackForks:2}),
      C('Mythic','Overfeeding','Breadcrumb damage heals Duck for 28% and converts 14% to shield.',{lifestealPct:.28,damageShieldPct:.14,shieldCap:6500}),
      C('Mythic','Flock Launch Armor','Casting Duck Duck Goose grants 2900 shield and 30% speed.',{superShield:2900,superSpeedPct:.3,superSpeedMs:4300,shieldCap:7100}),
      C('Mythic','Goose Lane Parade','Super projectiles fork twice and gain 65% range.',{sushiSuperForks:2,sushiSuperRangePct:.65}),
      C('Legendary','Bread Chain','Crumb damage chains 40% and every third hit reloads 0.6 ammo.',{chainDamagePct:.4,chainRadius:350,thirdHitAmmo:.6}),
      C('Exotic','THE SKY IS BREAD','Breadcrumb Stream fires five homing, piercing crumbs with 40% lifesteal; the flock grants full ammo and 4800 shield.',{sushiAttackForks:3,sushiAttackHoming:.85,sushiAttackHomingRadius:760,sushiAttackPierce:1,lifestealPct:.4,superAmmo:3,superShield:4800,shieldCap:10200})
    ],
    fastpass:[
      C('Epic','Three-Lane Ticket','Speed Ticket gains one angled third projectile while preserving its left-right cadence.',{sushiAttackForks:1}),
      C('Epic','Momentum Slipstream','Tickets fly 45% faster and travel 35% farther.',{sushiAttackSpeedPct:.45,sushiAttackRangePct:.35}),
      C('Epic','Pit-Lane Recovery','Speed Ticket damage heals Fastpass for 18% of damage dealt.',{lifestealPct:.18}),
      C('Mythic','Fast Lane Pit Stop','Casting Fast Lane instantly restores 2 ammo and grants 1700 shield.',{superAmmo:2,superShield:1700,shieldCap:5600}),
      C('Mythic','Team Draft','Fast Lane sends four 52%-damage tickets outward to clear space around the team.',{towerSuperOrbitCount:4,towerSuperOrbitDamagePct:.52}),
      C('Mythic','Victory Lap','A defeat grants 28% speed for 3.5 seconds and reloads 0.75 ammo.',{killSpeedPct:.28,killSpeedMs:3500,killAmmo:.75}),
      C('Legendary','Perfect Racing Line','Every third ticket hit restores 12% Super and grants 650 shield.',{thirdHitSuperCharge:12,thirdHitShield:650,shieldCap:6200}),
      C('Exotic','NO SPEED LIMIT','Speed Ticket fires four piercing, homing lanes; Fast Lane restores full ammo and surrounds Fastpass with eight ticket bursts.',{sushiAttackForks:3,sushiAttackPierce:1,sushiAttackHoming:.78,sushiAttackHomingRadius:760,superAmmo:3,towerSuperOrbitCount:8,towerSuperOrbitDamagePct:.6})
    ],
    freestyle:[
      C('Epic','Disco Double Feature','Each Setlist attack forks into a second performance lane.',{sushiAttackForks:1}),
      C('Epic','Tour-Grade Speakers','Setlist attacks become 45% larger and travel 30% farther.',{sushiAttackSizePct:.45,sushiAttackRangePct:.3}),
      C('Epic','Microphone Cashback','Damaging an enemy heals Freestyle for 16% of the damage.',{lifestealPct:.16}),
      C('Mythic','Center Stage Soundwall','Center Stage becomes 70% larger and reaches 45% farther.',{sushiSuperSizePct:.7,sushiSuperRangePct:.45}),
      C('Mythic','Encore Refill','Casting Center Stage restores 2 ammo and heals 1500 HP.',{superAmmo:2,superHeal:1500}),
      C('Mythic','Surround Sound','Center Stage releases six mini speaker blasts around Freestyle.',{towerSuperOrbitCount:6,towerSuperOrbitDamagePct:.5}),
      C('Legendary','Three-Song Streak','Every third Setlist hit restores 14% Super and 0.45 ammo.',{thirdHitSuperCharge:14,thirdHitAmmo:.45}),
      C('Exotic','ENDLESS ENCORE','Every instrument fires four piercing lanes with a returning pass; Center Stage grants full ammo, 4300 shield, and eight speaker bursts.',{sushiAttackForks:3,sushiAttackPierce:1,sushiAttackReturn:1,superAmmo:3,superShield:4300,shieldCap:9000,towerSuperOrbitCount:8,towerSuperOrbitDamagePct:.58})
    ],
    portalo:[
      C('Epic','Triple Doorway','Portal Shot forks into two linked side orbs.',{sushiAttackForks:2}),
      C('Epic','Cross-Map Shortcut','Portal Shot gains 70% range and 35% projectile speed.',{sushiAttackRangePct:.7,sushiAttackSpeedPct:.35}),
      C('Epic','Dimensional Wake','The portal orb grows 55% during flight and leaves a 20%-damage dimensional trail.',{towerTravelGrowthPct:.55,towerTrailDamagePct:.2,towerTrailRadius:64,towerTrailEveryMs:370}),
      C('Mythic','Prison Expansion','Portal Prison becomes 75% larger.',{sushiSuperSizePct:.75}),
      C('Mythic','Emergency Exit','Casting Portal Prison grants 30% speed for 3 seconds and restores 1 ammo.',{superSpeedPct:.3,superSpeedMs:3000,superAmmo:1}),
      C('Mythic','Portal Battery','Every third Portal Shot hit restores 15% Super.',{thirdHitSuperCharge:15}),
      C('Legendary','Exit Shockwave','Portal Shot hits pull nearby enemies 75 pixels and splash 32% damage.',{pull:75,splashDamagePct:.32,splashRadius:150}),
      C('Exotic','EVERYWHERE IS AN EXIT','Portal Shot fires five homing, piercing orbs; Portal Prison grants 4000 shield and releases eight dimensional bolts.',{sushiAttackForks:3,sushiAttackHoming:.88,sushiAttackHomingRadius:820,sushiAttackPierce:1,superShield:4000,shieldCap:8800,towerSuperOrbitCount:8,towerSuperOrbitDamagePct:.62})
    ],
    ghoul:[
      C('Epic','Third Hand','Haunt adds one extra spectral hand lane to the closing slap.',{towerAttackEchoCount:1,towerAttackEchoDelayMs:140,towerAttackEchoDamagePct:.6}),
      C('Epic','Long-Armed Haunting','Haunt reaches 55% farther and deals 12% more damage.',{sushiAttackRangePct:.55,damagePct:.12}),
      C('Epic','Cold Handprint','Hand hits slow victims for 1.2 seconds.',{slowMs:1200}),
      C('Mythic','Mist-Fed Fear','Haunt damage heals Ghoul for 20% of damage dealt.',{lifestealPct:.2}),
      C('Mythic','Party of Eight','Invisible Party releases eight ghost-hand impacts around Ghoul.',{towerSuperOrbitCount:8,towerSuperOrbitDamagePct:.48}),
      C('Mythic','Possessed Escape','Casting Invisible Party grants 2600 shield and restores 1 ammo.',{superShield:2600,superAmmo:1,shieldCap:6800}),
      C('Legendary','Fear Feeds Fear','Every third hand hit restores 16% Super and pulls the victim 65 pixels.',{thirdHitSuperCharge:16,pull:65}),
      C('Exotic','THE SKY HAS HANDS','Every Haunt repeats twice, deals 30% more damage, pulls victims inward, and Invisible Party surrounds Ghoul with twelve spectral impacts.',{towerAttackEchoCount:2,towerAttackEchoDelayMs:110,towerAttackEchoDamagePct:.7,damagePct:.3,pull:105,towerSuperOrbitCount:12,towerSuperOrbitDamagePct:.58})
    ],
    jacktrade:[
      C('Epic','Double Down','Landing the 1-card attack skips the 2-card step. Your next Double or Nothing immediately fires 4 cards.',{jackTradeDoubleDown:1}),
      C('Epic','Dealer Insurance','A complete miss only drops the streak one step instead of resetting it, and refunds 1 full ammo.',{jackTradeDealerInsurance:1}),
      C('Epic','Fifth Ace','The 4-card attack adds a fifth card through the center at FULL damage. Five cards means jackpot.',{jackTradeFifthAce:1}),
      C('Mythic','Compound Interest','Cards in a 4-card volley gain 25% damage from left to right. The fifth Ace inherits the final bonus.',{jackTradeCompoundInterest:.25}),
      C('Mythic','MARKET CRASH','A normal Trade of Fate unloads ALL SIX outcomes at once. Hyper ALL IN is not buffed by this card.',{jackTradeSuperUnloadAll:1}),
      C('Legendary','The House Remembers','Each different Trade of Fate outcome used this match permanently speeds reload by 8%, up to 48%.', {jackTradeHouseReloadPct:.08}),
      C('Legendary','Read the Tell','The locked outcome rigs every card: Demolition +50% size, Rush +50% speed, Toxic deals 450 poison, Slow lasts 1.2s, and healing outcomes restore 25% damage.',{jackTradeReadTheTell:1}),
      C('Exotic','ROYAL FLUSH','Replaces ALL IN completely: throw five giant cards in a pentagon, detonate each, then collapse the whole hand into one colossal jackpot blast.',{jackTradeRoyalFlush:1})
    ],
    darkener:[
      C('Epic','Creeping Night','Shroud Sweep crawls 28% farther and lingers at maximum reach for 30% longer.',{darkenerCloudRangePct:.28,darkenerCloudLingerPct:.3}),
      C('Epic','Smothering Cone','Shroud Sweep opens 38% wider from its narrow mouth to its final shadow edge.',{darkenerCloudWidthPct:.38}),
      C('Epic','One More Breath','Enemies who remain inside Shroud Sweep can suffer one additional damage tick.',{darkenerExtraTicks:1}),
      C('Mythic','No Moon Tonight','The first Shroud Sweep tick adds another 1.2 seconds of Darkness.',{darkenerDarknessBonusMs:1200}),
      C('Mythic','Seven-Sided Six-Sider','Darkagon grows 24% larger while keeping its unmistakable six-edge prison shape.',{darkenerDarkagonRadiusPct:.24}),
      C('Mythic','Hungry Border','Darkagon gains a damaging border even without Hypercharge; its edge hits deal 720 damage.',{darkenerEdgeActive:1,darkenerEdgeDamage:720}),
      C('Legendary','Lights Stay Out','Every third Shroud Sweep hit restores 15% Super, while its Darkness lasts 700ms longer.',{thirdHitSuperCharge:15,darkenerDarknessBonusMs:700}),
      C('Exotic','TOTAL ECLIPSE','Shroud Sweep becomes 45% wider, gains two extra ticks and longer Darkness. Darkagon becomes 30% larger and its hungry border deals 1050 damage.',{darkenerCloudWidthPct:.45,darkenerExtraTicks:2,darkenerDarknessBonusMs:1500,darkenerDarkagonRadiusPct:.3,darkenerEdgeActive:1,darkenerEdgeDamage:1050})
    ],
    awakenator:[
      C('Epic','REM Sleep Delivery','Dream Bolt becomes 40% larger and travels 55% farther, making distant Sleep setups easier.',{sushiAttackSizePct:.4,sushiAttackRangePct:.55}),
      C('Epic','Three Recurring Dreams','Dream Bolt forks into two angled memories that can prepare several enemies for corruption.',{sushiAttackForks:2}),
      C('Epic','Nightmare Transfer','Dream Bolt damage chains 32% into a nearby enemy and slows the original target a little longer.',{chainDamagePct:.32,chainRadius:340,slowMs:650}),
      C('Mythic','Lucid Recovery','Damage dealt by Dream Bolt heals Awakenator for 22% and restores 0.35 ammo every third hit.',{lifestealPct:.22,thirdHitAmmo:.35}),
      C('Mythic','Past, Present, Protected','Using Awaken My Past, Present and Future grants 3000 shield while the corrupted attacks unfold.',{superShield:3000,shieldCap:7600}),
      C('Mythic','Memory Flood','The Power Move restores 2 ammo and grants 30% movement speed for 3.5 seconds.',{superAmmo:2,superSpeedPct:.3,superSpeedMs:3500}),
      C('Legendary','Everybody Remembers','Every third Dream Bolt hit restores 16% Power Move charge and splashes 28% damage around the sleeper.',{thirdHitSuperCharge:16,splashDamagePct:.28,splashRadius:155}),
      C('Exotic','THE NIGHTMARE IS AWAKE','Dream Bolt fires five homing, piercing memory shards; the Power Move restores full ammo, grants 4400 shield, and releases ten dream bolts around Awakenator.',{sushiAttackForks:3,sushiAttackHoming:.9,sushiAttackHomingRadius:900,sushiAttackPierce:1,superAmmo:3,superShield:4400,shieldCap:9800,towerSuperOrbitCount:10,towerSuperOrbitDamagePct:.58})
    ],
    ramage:[
      C('Epic','Iron Spiked Gauntlets','Battering Fist deals 25% more base damage and becomes 30% larger.',{sushiAttackDamagePct:.25,sushiAttackSizePct:.3}),
      C('Epic','Momentum Step','Landing Battering Fist grants 20% movement speed for 1.8 seconds.',{hitSpeedPct:.2,hitSpeedMs:1800}),
      C('Epic','Heavy Concussion','Battering Fist hits slow targets for 1.2 seconds and splash 30% damage to nearby enemies.',{slowMs:1200,splashDamagePct:.3,splashRadius:160}),
      C('Mythic','Adrenaline Overdrive','Casting Adrenaline or Super instantly restores 2 ammo and grants 3200 shield.',{superAmmo:2,superShield:3200,shieldCap:8000}),
      C('Mythic','Twin Fist Echo','Battering Fist forks into two heavy shockwave fists with no multiplier limit.',{sushiAttackForks:2}),
      C('Mythic','Violent Rebound','Boomerang Rampage dash distance +40% and return flurries gain 50% speed and range.',{sushiSuperRangePct:.4,sushiSuperSpeedPct:.5}),
      C('Legendary','Unbounded Ramp','Every landed strike boosts Super charge by 18% and heals for 20% of damage dealt.',{thirdHitSuperCharge:18,lifestealPct:.2}),
      C('Legendary','Juggernaut Momentum','While dashing or above 5.0x multiplier, Ramage deflects 40% damage and releases six rotating kinetic shards.',{damageReductionPct:.4,towerSuperOrbitCount:6,towerSuperOrbitDamagePct:.45}),
      C('Exotic','TITAN OVERDRIVE CATACLYSM','Battering Fist fires five homing piercing sonic shockwaves; Boomerang Rampage grants full ammo, 5200 shield, and releases four returning shadow needle lanes.',{sushiAttackForks:3,sushiAttackHoming:.85,sushiAttackHomingRadius:800,sushiAttackPierce:1,superAmmo:3,superShield:5200,shieldCap:12000,sushiSuperForks:3,sushiSuperReturn:1})
    ],
  };
  Object.assign(decks,handmadeDecks);

  window.SLOP_SUSHI_DECKS={};
  ids.forEach(id=>window.SLOP_SUSHI_DECKS[id]=D(id,decks[id]));
})();
