(function (root) {
  'use strict';
  // Shared vector model geometry: the fighter cards and battlefield use the same
  // silhouettes. No emoji fonts, particles, image downloads or per-frame gradients.
  const looks = {
    outlit:['robot','#ffc52f','#20e7ef'], fuser:['robot','#ff804a','#87bfff'], echo:['speaker','#626cff','#81fff1'],
    cheseypuff:['round','#ffc456','#fff2af'], decayer:['hood','#65ba53','#b4f881'], unopcoloco:['crown','#ff694e','#ffe96a'],
    dashaholic:['visor','#30d2ed','#fff190'], trapper:['visor','#ce844f','#66ecc4'], classy:['hat','#7e55c7','#fff3cb'],
    hyperorigin:['crystal','#a153e5','#68f2ff'], heater_miser:['furnace','#eb6949','#ffc356'], minigunnin:['robot','#f2774d','#fce174'],
    steamer:['furnace','#879aaa','#e5ffff'], bowlin_rida:['round','#be5dcc','#ffe67c'], money_and_tax:['hat','#47b889','#ffda58'],
    hunter:['hood','#9d475e','#ffe4be'], chaird:['chair','#b99064','#a0defe'], forest:['tree','#409f67','#b6e98b'],
    bouncin_balls:['ball','#249bdc','#c9f8ff'], goonbob:['round','#daca4f','#fff6aa'], tempo_maker:['speaker','#c97dc1','#76ffe1'],
    overlord:['crown','#8649c8','#fac653'], copyphase:['crystal','#7898cc','#c1fff7'], fightnfire:['furnace','#f07036','#ffe284'],
    beast:['horn','#ce4872','#ffd0df'], amplifier:['speaker','#687cbe','#92f5c9'], skeleflying:['skull','#eee7ce','#aa8aff'],
    crystila:['crystal','#a674e7','#dcffff'], hope:['halo','#e792b7','#fff6db'], evil_doctor:['medic','#519c89','#85ffb7'],
    splitter:['bomb','#a270c0','#ffd367'], scuba_diver:['visor','#419dbc','#ffbf63'], hoop:['ball','#e39146','#ffe9bf'],
    screener:['robot','#6293ad','#9cffd2'], malakor:['horn','#823fad','#e3a2ff'], beam:['robot','#e6b94d','#fffa9b'],
    paradox:['hourglass','#9084d7','#ffe5a3'], sera_eclipse:['halo','#624b9e','#e4c26e'], boom_arang:['visor','#de8538','#9cf5f1'],
    teether:['teeth','#ac86c9','#f4f0db'], fuel:['furnace','#b5ac45','#f5e399'], xray:['skull','#6dcbd0','#efffff'],
    angel:['halo','#d8b65b','#ffffff'], demon:['horn','#cd5165','#ffd2a1'], warrior:['sword','#758aa1','#d9e5f5'],
    relay:['robot','#48aebc','#e5ff9a'], upiedown:['visor','#a268d4','#89eafa'], chickpig:['beak','#e7b05d','#ffd3d3'],
    jetpack:['robot','#e47843','#cdefff'], snapper:['teeth','#65ad7d','#f5e09d'], robber:['hood','#8b83b1','#f3de82'],
    rocketeer:['rocket','#e66d56','#a7edff'], peter_pickle:['pickle','#72b548','#c9e578'], unstable:['crystal','#52c9b4','#ef9bef'],
    homer:['visor','#c49c66','#fcf1d5'], orbo:['planet','#8c75df','#e1b869'], predator:['horn','#526e9f','#cfedff'],
    fastpass:['visor','#4fcdbf','#fff195'], freestyle:['speaker','#c962d6','#80f3ff'], portalo:['portal','#8157d6','#7afff0'],
    ghoul:['ghost','#b1b5d3','#bd8cff'], jacktrade:['hat','#a164cd','#ffd778'], darkener:['hood','#534e80','#c2a1ff'],
    awakenator:['crystal','#ce984c','#edfcab'], adlof:['hat','#79847d','#dfbe77'], cluster:['bomb','#77927a','#ffcf66'],
    witch:['hat','#aa6fc7','#99e5a6'], boomer:['bomb','#ba6945','#ffce83'], blade_vane:['sword','#ad4962','#f3b8ba'],
    daggershard:['crystal','#559887','#c0ffdc'], ice_cream:['crown','#ecb8d1','#fff6e2'], swimmer:['visor','#47a6c7','#ccf5fd'],
    kage:['hood','#5d587d','#f394c2'], drainbow:['crystal','#699ab5','#f8b49c'], draflygon:['horn','#669869','#f7ce75'],
    axeywaxy:['sword','#b78358','#d8e6e9'], trampaheal:['medic','#39b890','#efffc5'], mageny:['magnet','#427ac0','#72eeef'],
    ramage:['horn','#ac4655','#ffd285'], upgradart:['robot','#639fcc','#ffffa2'], cinderion:['furnace','#cf663a','#ffcd70'],
    cursed:['ghost','#9a68ba','#e0b1fc'], king:['crown','#566db3','#ffd465'], anti_royal:['pirate','#46948c','#f6d383'],
    sir_cheeseburger:['helmet','#b38a5a','#ffda72'], weefee:['robot','#458f95','#74ffca'], blinkeye:['visor','#ff9800','#ffe082'], dr0ne:['robot','#00e5ff','#80d8ff'], unhitabble:['visor','#00f5d4','#d25bff'],
    carmela_fudge:['confection','#e67e22','#795548'],
    looma:['hood','#ff69cd','#ffd6ec'],
    feathers:['horn','#7fe7ff','#ffffff'],
    spikey:['horn','#a6e34d','#ffe45e'],
    electrostien:['robot','#00f5d4','#ffe45e'],
    mallow:['round','#ffdfb0','#ff8fb0'],
    nightshade:['hood','#9b5cff','#b6ff5e'],
    aegis:['helmet','#f0b429','#fff3b0']
  };
  const skins = {
    'fightn-spice':['firekeeper','#b63753','#ffbd79'],
    'astral-portalo':['astronaut','#e8ecfa','#7a9cff'],
    'neon-jacktrade':['dealer','#47377a','#74ffda'],
    'abyss-trapper':['diver','#071d3a','#42f5d7'],
    'reactor-decayer':['hazmat','#27382f','#a8ff3e'],
    'prism-seraph-angel':['seraph','#fff2b8','#79e9ff']
  };
  // Every fighter owns a visual identity assembled from kit-specific geometry.
  // The four fields are head feature, held weapon/prop, chest mark and build.
  // No two roster entries intentionally share the same combination.
  const identities = Object.freeze({
    outlit:'signal_lamp|light_caster|power_cell|lean', fuser:'split_coil|twin_fuses|fusion_core|wide',
    echo:'wave_phones|echo_discs|sound_rings|lean', cheseypuff:'cheese_cap|puff_sprayer|cheese_wedge|round',
    decayer:'spore_hood|decay_flask|biohazard|robe', unopcoloco:'pepper_crown|pepper_bombs|chili_mark|round',
    dashaholic:'speed_visor|dash_blades|speed_chevron|lean', trapper:'snare_goggles|jaw_trap|trap_teeth|wide',
    classy:'conductor_hat|music_baton|music_staff|tall', hyperorigin:'origin_crystal|energy_wand|origin_star|float',
    heater_miser:'furnace_stack|heat_nozzle|heat_coil|square', minigunnin:'ammo_helmet|minigun|bullet_belt|wide',
    steamer:'boiler_stack|steam_pipe|pressure_gauge|square', bowlin_rida:'bowling_pins|bowling_ball|lane_arrow|round',
    money_and_tax:'coin_hat|tax_stamps|coin_scale|tall', hunter:'antler_hood|long_bow|target_mark|lean',
    chaird:'chair_back|chair_arms|seat_buckle|wide', forest:'leaf_canopy|branch_staff|tree_rings|tall',
    bouncin_balls:'ball_antennae|bounce_orbs|bounce_arc|round', goonbob:'goo_tuft|goo_fists|goo_drop|round',
    tempo_maker:'tempo_phones|beat_pads|metronome|lean', overlord:'imperial_crown|royal_wand|overlord_eye|tall',
    copyphase:'mirror_crest|phase_mirrors|copy_gem|float', fightnfire:'dual_flames|fire_ice_gauntlets|twin_core|wide',
    beast:'razor_horns|beast_claws|paw_slash|wide', amplifier:'amp_towers|amp_cannons|volume_meter|square',
    skeleflying:'skull_wings|bone_daggers|winged_skull|float', crystila:'crystal_tiara|prism_scepter|gem_flower|tall',
    hope:'heart_halo|hope_ray|heart_wings|float', evil_doctor:'doctor_cap|dna_syringe|dna_helix|tall',
    splitter:'split_fuse|split_launcher|split_fractal|round', scuba_diver:'dive_helmet|harpoon|air_gauge|wide',
    hoop:'hoop_crown|basket_ball|basket_net|lean', screener:'screen_face|remote_blaster|pixel_grid|square',
    malakor:'void_horns|void_blades|malakor_rune|wide', beam:'beam_lens|beam_cannon|laser_aperture|lean',
    paradox:'clock_crest|time_blades|hourglass_mark|float', sera_eclipse:'eclipse_halo|moon_staff|eclipse_mark|float',
    boom_arang:'rang_hat|boomerang|return_arrow|lean', teether:'tooth_crown|bite_launcher|tooth_mark|round',
    fuel:'fuel_cap|fuel_hose|fuel_meter|square', xray:'xray_skull|scan_beam|rib_mark|lean',
    angel:'angel_halo|light_spear|angel_wings|float', demon:'demon_horns|hell_forks|demon_tail|wide',
    warrior:'war_helm|great_sword|shield_mark|wide', relay:'relay_dishes|signal_orbs|relay_nodes|square',
    upiedown:'arrow_visor|flip_blades|up_down_arrows|lean', chickpig:'chick_comb|pig_launcher|egg_mark|round',
    jetpack:'flight_helmet|jet_cannons|wing_meter|lean', snapper:'snap_jaw|snap_claws|shell_spiral|round',
    robber:'loot_hood|money_bag|lock_mark|lean', rocketeer:'rocket_helmet|rocket_tubes|blast_star|wide',
    peter_pickle:'pickle_cap|pickle_jar|pickle_slice|tall', unstable:'shard_crown|unstable_bolts|cracked_core|float',
    homer:'home_cap|home_run_bat|diamond_mark|lean', orbo:'orbit_rings|planet_orbs|solar_system|float',
    predator:'predator_spikes|hunter_claws|fang_mark|wide', fastpass:'speed_fins|ticket_shooters|momentum_meter|lean',
    freestyle:'dj_phones|instrument_set|disco_mark|tall', portalo:'portal_horns|portal_orbs|linked_portals|float',
    ghoul:'ghost_cowl|sky_hands|haunt_eye|robe', jacktrade:'dealer_hat|card_fan|dice_core|tall',
    darkener:'dark_veil|shadow_cone|dark_hex|robe', awakenator:'wake_crystal|alarm_bolts|awake_eye|float',
    adlof:'marshal_cap|command_baton|guard_mark|tall', cluster:'cluster_fuse|cluster_bombs|triangle_burst|round',
    witch:'witch_hat|potion_staff|tomb_mark|robe', boomer:'boom_fuse|dynamite_sticks|blast_mark|round',
    blade_vane:'blade_crest|blood_sword|spin_mark|lean', daggershard:'dagger_crown|glass_daggers|shard_burst|lean',
    ice_cream:'sundae_crown|scoop_cannon|snow_cone|round', swimmer:'swim_cap|stroke_blades|wave_meter|lean',
    kage:'shadow_scarf|kage_kunai|shadow_cross|lean', drainbow:'rainbow_prism|paint_caster|rainbow_road|float',
    draflygon:'dragon_horns|flame_wings|dragon_scale|wide', axeywaxy:'axe_helm|double_axes|wood_ring|wide',
    trampaheal:'medic_beacon|heal_traps|healing_cross|tall', mageny:'magnet_horns|horseshoe_bolt|polarity_core|float',
    ramage:'ram_horns|stardust_fists|rage_star|wide', upgradart:'upgrade_scope|upgrade_cannon|level_chevron|square',
    cinderion:'ember_crown|cinder_fan|flame_orbit|float', cursed:'curse_veil|curse_orb|broken_crown|robe',
    king:'king_crown|royal_cannon|princess_tower|wide', anti_royal:'pirate_hat|gold_punch|mortar_mark|wide',
    sir_cheeseburger:'burger_helm|cheese_lance|burger_crest|wide', weefee:'wifi_antennae|data_caster|signal_bars|square',
    blinkeye:'giant_eye|eye_bolt|blink_reticle|float', dr0ne:'drone_rotors|drone_blaster|drone_eye|float',
    unhitabble:'dodge_eye|phase_blades|dodge_cross|lean',
    carmela_fudge:'baker_hat|caramel_hands|candy_swirl|wide',
    looma:'needle_hood|thread_needles|spool_mark|robe',
    feathers:'storm_plume|gale_feathers|wind_swirl|float',
    spikey:'spike_crown|thorn_balls|spike_mark|round',
    electrostien:'volt_helm|volt_knuckle|bolt_core|wide',
    mallow:'puff_cap|marshmallow_fan|mallow_swirl|round',
    nightshade:'night_veil|viper_daggers|venom_mark|robe',
    aegis:'bulwark_helm|bulwark_shield|bubble_mark|wide'
  });
  function hash(text){let value=2166136261;for(const ch of String(text)){value^=ch.charCodeAt(0);value=Math.imul(value,16777619);}return value>>>0;}
  function model(id, skin) { return skins[skin] || looks[id]; }
  function identityFor(id){return (identities[id]||('plain_'+id+'|kit_'+id+'|mark_'+id+'|lean')).split('|');}
  function addPersonalGeometry(list,id,accent,coat){
    const [head,weapon,mark,build]=identityFor(id),seed=hash(id+'|'+head+'|'+weapon+'|'+mark);
    const ellipse=(x,y,rx,ry,c)=>list.push(['ellipse',x,y,rx,ry,c]);
    const rect=(x,y,w,h,c)=>list.push(['rect',x,y,w,h,c]);
    const poly=(points,c)=>list.push(['poly',points,c]);
    const line=(points,c,w=2)=>list.push(['line',points,c,w]);
    // A kit-shaped crest. Its point count, lean and height are identity-derived,
    // so even fighters in the same archetype do not share a silhouette.
    const points=3+(seed%5),crestW=12+((seed>>>3)%9),crestH=8+((seed>>>7)%15),lean=((seed>>>11)%9)-4;
    const crest=[];for(let i=0;i<points;i++){const t=i/(points-1),zig=i%2?1:.3;crest.push([50-crestW+crestW*2*t+lean*t,25-crestH*zig]);}
    line(crest,accent,3);ellipse(crest[crest.length-1][0],crest[crest.length-1][1],2.4,2.4,'#eefcff');
    // The held kit prop is deliberately large enough to change the combat
    // silhouette rather than reading as a tiny recoloured badge.
    const side=(seed&1)?-1:1,wx=50+side*(31+((seed>>>13)%5)),wy=57+((seed>>>16)%8),weaponKind=(seed>>>19)%6;
    if(weaponKind===0){rect(Math.min(wx-side*3,wx+side*15),wy-18,18,8,coat);rect(Math.min(wx+side*10,wx+side*18),wy-21,8,4,accent);}
    else if(weaponKind===1){poly([[wx,wy-18],[wx+side*16,wy-8],[wx+side*11,wy+8],[wx-side*3,wy+3]],coat);ellipse(wx+side*10,wy-7,4,4,accent);}
    else if(weaponKind===2){line([[wx-side*2,wy+14],[wx+side*4,wy-19],[wx+side*10,wy-25]],accent,5);poly([[wx+side*6,wy-24],[wx+side*19,wy-18],[wx+side*10,wy-10]],coat);}
    else if(weaponKind===3){ellipse(wx,wy-5,10,13,coat);list.push(['ring',wx,wy-5,7,9,accent,3]);}
    else if(weaponKind===4){rect(Math.min(wx-side*4,wx+side*8),wy-20,12,28,coat);for(let i=0;i<3;i++)ellipse(wx+side*(10+i*5),wy-15+i*7,3,3,accent);}
    else {poly([[wx,wy-21],[wx+side*14,wy-12],[wx+side*7,wy+11],[wx-side*6,wy+4]],accent);line([[wx,wy-18],[wx+side*6,wy+5]],'#eefcff',2);}
    // Personal chest rune: asymmetrical vector geometry, never an emoji/font.
    const markSeed=hash(mark),nodes=3+(markSeed%4),ringR=7+((markSeed>>>5)%4);
    list.push(['ring',50,69,ringR,ringR*.72,accent,2]);
    for(let i=0;i<nodes;i++){const a=(Math.PI*2*i/nodes)+((markSeed>>>9)%20)/20;const r=i%2?ringR*.45:ringR;ellipse(50+Math.cos(a)*r,69+Math.sin(a)*r*.72,1.8+(i%2),1.8+(i%2),i%2?'#eaf8ff':coat);}
    // Build-specific outer pieces make stance and mass readable at match scale.
    if(build==='float'){poly([[29,79],[18,89],[35,87]],accent);poly([[71,79],[82,89],[65,87]],accent);}
    else if(build==='wide'){rect(13,55,14,25,coat);rect(73,55,14,25,coat);}
    else if(build==='robe'){poly([[30,75],[17,96],[45,87]],coat);poly([[70,75],[83,96],[55,87]],coat);}
    else if(build==='tall'){line([[31,76],[25,94]],accent,5);line([[69,76],[75,94]],accent,5);}
    else if(build==='square'){rect(19,61,12,20,accent);rect(69,61,12,20,accent);}
  }
  // Shapes are expressed in a 100x100 model space, so UI and combat stay identical.
  function shapes(id, skin) {
    const entry = model(id, skin); if (!entry) return [];
    const [type, coat, accent] = entry;
    const list = [];
    const ellipse=(x,y,rx,ry,c)=>list.push(['ellipse',x,y,rx,ry,c]);
    const rect=(x,y,w,h,c)=>list.push(['rect',x,y,w,h,c]);
    const poly=(points,c)=>list.push(['poly',points,c]);
    ellipse(50,89,31,7,'#07101e');
    rect(30,76,15,12,'#172237'); rect(55,76,15,12,'#172237');
    poly([[23,79],[28,53],[72,53],[78,79],[60,85],[40,85]],coat);
    poly([[60,56],[72,53],[78,79],[60,85]],'#172237');
    ellipse(50,40,28,29,coat); ellipse(42,32,17,19,accent);
    ellipse(50,43,22,19,'#172237');
    rect(34,39,11,6,accent);rect(55,39,11,6,accent);
    rect(43,53,14,3,'#e5efff'); rect(47,66,6,10,accent);
    if(id==='fightnfire') {
      // Twin flame gauntlets and a charcoal visor, shared by cards and combat.
      poly([[22,30],[15,14],[27,20],[29,3],[40,18],[47,9],[56,20],[72,5],[73,21],[86,15],[77,34]],accent);
      poly([[31,27],[34,15],[43,25],[49,18],[57,28],[68,17],[68,34]],coat);
      rect(24,32,52,17,'#201925');rect(31,37,14,4,'#fff4c8');rect(55,37,14,4,'#fff4c8');
      poly([[8,53],[22,48],[29,60],[25,80],[8,76]],coat);
      poly([[72,60],[79,48],[93,53],[92,76],[75,80]],coat);
      ellipse(15,64,7,9,'#271a29');ellipse(85,64,7,9,'#271a29');
      ellipse(15,64,3,5,accent);ellipse(85,64,3,5,accent);
      rect(32,64,36,15,'#352535');rect(36,69,28,4,accent);
      addPersonalGeometry(list,id,accent,coat);
      return list;
    }
    if(['hat','dealer','pirate'].includes(type)) {rect(17,23,66,7,accent);poly([[28,23],[32,3],[65,3],[73,23]],coat);rect(30,17,39,5,accent);}
    if(type==='crown'){poly([[22,26],[20,6],[37,16],[50,0],[63,16],[80,6],[77,26]],accent);rect(26,24,48,5,'#a86a29');}
    if(['horn','teeth'].includes(type)){poly([[27,28],[10,4],[13,32],[26,43]],accent);poly([[73,28],[90,4],[87,32],[74,43]],accent);}
    if(type==='hood'||type==='ghost'){poly([[18,49],[23,18],[50,3],[77,18],[82,49],[70,28],[50,18],[30,28]],coat);if(type==='ghost')poly([[23,73],[16,92],[35,85],[48,96],[62,85],[81,92],[77,73]],coat);}
    if(type==='speaker'){rect(19,21,9,43,'#172237');rect(72,21,9,43,'#172237');ellipse(33,69,9,9,accent);ellipse(66,69,9,9,accent);}
    if(['visor','astronaut','helmet'].includes(type)){rect(22,30,56,21,'#132638');rect(27,33,35,4,accent);rect(72,32,8,20,accent);}
    if(type==='robot'){rect(24,13,52,10,accent);rect(17,33,8,20,coat);rect(75,33,8,20,coat);rect(46,5,8,10,accent);}
    if(type==='ball'||type==='round'){list.push(['line',[[26,24],[42,39],[50,64]],accent,3]);list.push(['line',[[70,23],[60,39],[50,64]],accent,3]);}
    if(type==='crystal'){poly([[25,24],[34,6],[50,0],[68,9],[76,25],[52,16]],accent);poly([[50,0],[52,16],[76,25],[68,9]],coat);}
    if(type==='sword'){poly([[76,70],[82,13],[87,4],[92,14],[88,70]],accent);rect(73,64,21,5,coat);}
    if(type==='medic'){rect(26,15,48,14,'#ecfff7');rect(46,12,8,21,accent);rect(39,19,22,7,accent);}
    if(type==='furnace'||type==='bomb'){rect(33,10,34,10,'#283144');poly([[43,12],[42,1],[55,9],[60,0],[65,15]],accent);rect(30,65,40,12,'#172237');rect(35,69,30,4,accent);}
    if(type==='tree'||type==='pickle'){ellipse(50,17,26,13,accent);ellipse(25,29,12,12,coat);ellipse(75,29,12,12,coat);}
    if(type==='beak'){poly([[43,47],[60,47],[71,54],[44,56]],accent);}
    if(type==='skull'){ellipse(50,49,15,19,'#efeadc');ellipse(40,40,9,11,'#172237');ellipse(60,40,9,11,'#172237');rect(45,57,3,9,'#172237');rect(52,57,3,9,'#172237');}
    if(type==='halo'||type==='planet'||type==='portal'||type==='astronaut'){list.push(['ring',50,19,35,9,accent,4]);}
    if(type==='rocket'){poly([[17,70],[17,42],[22,27],[28,42],[28,70]],accent);poly([[73,70],[73,42],[78,27],[84,42],[84,70]],accent);}
    if(type==='chair'){rect(17,48,9,40,accent);rect(74,48,9,40,accent);rect(21,76,60,7,accent);}
    if(type==='magnet'){poly([[19,17],[31,17],[31,30],[24,30]],'#ff6378');poly([[69,17],[81,17],[76,30],[69,30]],accent);}
    if(type==='hourglass'){poly([[28,8],[72,8],[56,24],[71,31],[29,31],[44,24]],accent);}
    if(type==='dealer'){poly([[75,55],[91,51],[95,73],[79,77]],'#eefbff');poly([[84,56],[88,64],[85,71],[81,64]],accent);}
    if(type==='diver'){
      rect(18,27,64,26,'#04111f');list.push(['ring',50,40,25,15,accent,4]);
      poly([[8,61],[25,52],[34,69],[24,85],[7,77]],coat);poly([[92,61],[75,52],[66,69],[76,85],[93,77]],coat);
      for(const x of [13,87]){poly([[x-7,61],[x,53],[x+7,61],[x,69]],accent);}
    }
    if(type==='hazmat'){
      poly([[20,51],[24,19],[38,5],[62,5],[76,19],[80,51],[67,29],[50,22],[33,29]],'#16231c');
      rect(26,31,48,17,'#08120c');rect(31,35,38,7,accent);
      list.push(['ring',50,69,12,12,accent,3]);for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3;poly([[50+Math.cos(a)*4,69+Math.sin(a)*4],[50+Math.cos(a-.38)*12,69+Math.sin(a-.38)*12],[50+Math.cos(a+.38)*12,69+Math.sin(a+.38)*12]],accent);}
    }
    if(type==='seraph'){
      list.push(['ring',50,10,27,7,accent,4]);
      poly([[25,49],[4,31],[12,57],[2,72],[30,67]],'#d9fbff');poly([[75,49],[96,31],[88,57],[98,72],[70,67]],'#d9fbff');
      poly([[50,2],[57,17],[50,28],[43,17]],'#ffffff');list.push(['ring',50,67,10,15,accent,3]);
    }
    addPersonalGeometry(list,id,accent,coat);
    return list;
  }
  function paint(ctx, parts) {
    for(const p of parts){ctx.beginPath();
      if(p[0]==='ellipse'||p[0]==='ring'){ctx.ellipse(p[1],p[2],p[3],p[4],0,0,Math.PI*2);ctx.fillStyle=p[5];if(p[0]==='ring'){ctx.strokeStyle=p[5];ctx.lineWidth=p[6];ctx.stroke();}else ctx.fill();}
      else if(p[0]==='rect'){ctx.fillStyle=p[5];ctx.fillRect(p[1],p[2],p[3],p[4]);}
      else {p[1].forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));if(p[0]==='poly'){ctx.closePath();ctx.fillStyle=p[2];ctx.fill();}else{ctx.strokeStyle=p[2];ctx.lineWidth=p[3];ctx.stroke();}}
    }
  }
  const cache = new Map();
  function parts(id,skin){const key=id+':'+(skin||'');if(!cache.has(key))cache.set(key,shapes(id,skin));return cache.get(key);}
  function portrait(id,skin){
    if(!model(id,skin))return '';
    return '<svg class="fighter-portrait-art" viewBox="0 0 100 100" aria-hidden="true">'+parts(id,skin).map(p=>{
      if(p[0]==='ellipse')return `<ellipse cx="${p[1]}" cy="${p[2]}" rx="${p[3]}" ry="${p[4]}" fill="${p[5]}"/>`;
      if(p[0]==='ring')return `<ellipse cx="${p[1]}" cy="${p[2]}" rx="${p[3]}" ry="${p[4]}" fill="none" stroke="${p[5]}" stroke-width="${p[6]}"/>`;
      if(p[0]==='rect')return `<rect x="${p[1]}" y="${p[2]}" width="${p[3]}" height="${p[4]}" fill="${p[5]}"/>`;
      return `<${p[0]==='poly'?'polygon':'polyline'} points="${p[1].map(v=>v.join(',')).join(' ')}" fill="${p[0]==='poly'?p[2]:'none'}" stroke="${p[2]}" stroke-width="${p[3]||0}"/>`;
    }).join('')+'</svg>';
  }
  function draw(ctx,entity,y,id,skin,now,boss){
    const entry=model(id,skin);if(!entry||!Number.isFinite(entity.x)||!Number.isFinite(y))return false;
    const radius=Number.isFinite(entity.radius)?Math.max(12,entity.radius):14;
    const kick=Math.max(0,1-(now-(entity.visualAttackAt??-9999))/180);
    const surge=Math.max(0,1-(now-(entity.visualSuperAt??-9999))/500);
    const angle=Number.isFinite(entity.visualAimAngle)?entity.visualAimAngle:0;
    const poseSeed=hash(id+'|'+identityFor(id)[1]),poseKind=poseSeed%5;
    ctx.save();ctx.translate(entity.x,y);const scale=radius*2.6/100*(boss?1.3:1);ctx.scale(scale,scale);
    if(surge){ctx.strokeStyle=entry[2];ctx.globalAlpha=surge*.65;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,25,38+(1-surge)*20,14+(1-surge)*8,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    // Individual recoil language: lean, hop, twist, brace or lunge. This keeps
    // live fighters from sharing the same animation with a different colour.
    if(poseKind===0)ctx.rotate(-Math.sin(angle)*kick*.12);
    else if(poseKind===1)ctx.translate(Math.cos(angle)*kick*5,-kick*5);
    else if(poseKind===2)ctx.scale(1+kick*.08,1-kick*.05);
    else if(poseKind===3)ctx.rotate(Math.cos(angle)*kick*.1);
    else ctx.translate(-Math.cos(angle)*kick*4,-kick*2);
    ctx.translate(-50,-52-kick*(2+(poseSeed%4)));paint(ctx,parts(id,skin));
    // Art-only recoil and hand pose; hitboxes and projectile origins stay untouched.
    const reach=27+(poseSeed%8),handY=52+((poseSeed>>>5)%9);
    ctx.fillStyle=entry[2];ctx.beginPath();ctx.ellipse(50+Math.cos(angle)*(reach-kick*5),handY+Math.sin(angle)*(8+(poseSeed%6)),7+(poseSeed%3),5+(poseSeed%2),angle,0,Math.PI*2);ctx.fill();
    if(kick){ctx.globalAlpha=kick*.7;ctx.strokeStyle=entry[2];ctx.lineWidth=2+(poseSeed%3);ctx.beginPath();ctx.moveTo(50+Math.cos(angle)*reach,handY+Math.sin(angle)*8);ctx.lineTo(50+Math.cos(angle)*(reach+10+(poseSeed%9)),handY+Math.sin(angle)*(11+(poseSeed%7)));ctx.stroke();}
    ctx.restore();return true;
  }
  root.BraweRosterVisuals=Object.freeze({looks,skins,identities,portrait,draw,has:id=>!!looks[id],identity:id=>identityFor(id).slice()});
})(globalThis);
