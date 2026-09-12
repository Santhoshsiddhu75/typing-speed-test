/**
 * Hard passages — technical and academic prose.
 *
 * Measured average word length is ~8.0 characters. The long words are carried by
 * ordinary connective ones, which is what keeps these readable; a passage built
 * only from long nouns scores well on the band and reads like nonsense, which
 * is the failure mode this library was written to replace.
 */
export const HARD_PASSAGES: string[] = [
  'Distributed systems must reconcile consistency against availability whenever network partitions interrupt communication between nodes. Engineers therefore choose deliberate compromises, accepting temporarily divergent replicas that reconverge once connectivity returns. Understanding these tradeoffs prevents architectures promising guarantees the underlying infrastructure cannot possibly deliver under realistic failure conditions.',

  'Adaptive immunity depends on generating enormous receptor diversity before any pathogen is encountered. Lymphocytes rearrange gene segments combinatorially, producing populations capable of recognising molecular structures evolution never specifically anticipated. Subsequent selection eliminates self reactive cells, retaining specificity without catastrophic autoimmune consequences for surrounding tissue.',

  'Quantum measurement remains philosophically contested despite unambiguous experimental agreement about predicted probabilities. Competing interpretations reproduce identical observable outcomes while disagreeing fundamentally about what physically occurs during observation. Practitioners generally proceed instrumentally, applying formalism successfully without committing to any particular metaphysical account of collapse.',

  'Cryptographic security rests on computational difficulty rather than mathematical impossibility. Contemporary algorithms assume certain problems resist efficient solution, an assumption unproven and potentially vulnerable to algorithmic breakthroughs. Responsible deployment therefore anticipates eventual obsolescence and builds migration pathways before demonstrated weaknesses force emergency replacement.',

  'Climate models represent atmospheric circulation on grids substantially coarser than many meteorologically significant processes. Convection, cloud formation and turbulence consequently require parameterisation, approximating unresolved behaviour through statistical relationships. Disagreement between competing projections frequently originates in these approximations rather than in fundamental physical understanding.',

  'Genome sequencing generates data far faster than interpretation can meaningfully proceed. Identifying variants is now routine, whereas establishing whether a particular variant contributes causally to disease remains genuinely difficult. Population scale comparison provides statistical association without demonstrating the mechanistic relationship clinicians actually require.',

  'Materials scientists increasingly design microstructure deliberately rather than accepting whatever solidification produces. Controlling grain boundaries, precipitate distribution and dislocation density permits mechanical properties unobtainable through composition alone. Identical alloys processed differently exhibit strength variations exceeding those between entirely different chemical formulations.',

  'Epidemiological inference must continuously distinguish correlation from causation using observational data that experiments could settle directly. Confounding variables, selection effects and reporting biases operate simultaneously and often in opposing directions. Methodological sophistication reduces but never eliminates the interpretive uncertainty inherent in non experimental investigation.',

  'Linguistic typology demonstrates that grammatical categories considered universal frequently reflect the particular languages researchers examined first. Tense, definiteness and grammatical subject are encoded inconsistently across unrelated families. Comparative work consequently proceeds by identifying functional equivalences rather than assuming structural correspondence between superficially similar constructions.',

  'Macroeconomic policy operates through transmission mechanisms whose timing remains imprecisely characterised. Interest rate adjustments influence investment, consumption and expectations across intervals measured in quarters rather than weeks. Policymakers therefore respond to conditions that will have changed substantially before their interventions produce measurable consequences.',

  'Stellar nucleosynthesis explains elemental abundances through successive fusion stages terminating at iron. Heavier elements require neutron capture occurring during supernovae or neutron star mergers, environments producing conditions unavailable in ordinary stellar interiors. Observed abundance ratios consequently record the violent history of preceding generations.',

  'Robotic manipulation remains disproportionately difficult compared with locomotion because contact mechanics resist accurate modelling. Friction, deformation and unexpected compliance introduce uncertainty that accumulates rapidly during multi step operations. Practical systems increasingly substitute reactive feedback for precise prediction, abandoning deterministic planning in genuinely unstructured environments.',

  'Ecological communities exhibit stability properties that individual population models fail to anticipate. Interaction networks distribute disturbance across multiple species, sometimes damping perturbations and occasionally amplifying them unpredictably. Conservation strategies targeting single species consequently produce outcomes that surprise practitioners expecting proportional responses.',

  'Pharmacokinetics determines therapeutic effectiveness at least as strongly as receptor affinity. A compound binding its target powerfully remains clinically useless if metabolism eliminates it before reaching adequate tissue concentrations. Development programmes therefore optimise absorption, distribution and clearance concurrently with the underlying pharmacological activity.',

  'Seismologists reconstruct planetary interior structure from waves that never surface directly. Refraction and reflection at compositional boundaries produce characteristic arrival patterns at distant instruments, permitting inference about layers no instrument can reach. Discontinuities identified this way subsequently required substantial revision of accepted formation models.',

  'Ocean circulation redistributes heat globally through density differences arising from temperature and salinity variation. Surface currents driven by prevailing winds connect to deep return flows across intervals measured in centuries. Perturbing freshwater input at high latitudes potentially disrupts this coupling with consequences propagating hemispherically.',

  'Metallurgical failure analysis frequently reveals that catastrophic fractures originated at microscopic manufacturing imperfections. Cyclic loading propagates such defects incrementally, producing characteristic surface markings that record the progression retrospectively. Inspection intervals are consequently calculated from crack growth rates rather than from accumulated operating hours.',

  'Statistical significance testing was designed to control error rates across repeated experimentation, not to measure evidential strength within individual studies. Widespread misinterpretation has produced literatures containing substantial numbers of findings that replication attempts subsequently fail to confirm. Methodological reform emphasises estimation and uncertainty over binary decisions.',

  'Machine learning systems generalise from training distributions and degrade unpredictably when deployment conditions differ. Performance metrics computed on held out samples therefore overstate reliability whenever real inputs diverge systematically from collected data. Robustness evaluation increasingly emphasises distributional shift rather than aggregate accuracy on convenient benchmarks.',

  'Photosynthetic efficiency is constrained by an enzyme that occasionally fixes oxygen instead of carbon dioxide. This wasteful reaction consumes energy recovering usable intermediates, reducing theoretical productivity substantially. Certain plant lineages evolved concentrating mechanisms that suppress the competing reaction, achieving markedly higher performance under warm conditions.',

  'Antibiotic resistance propagates horizontally between bacterial species through mobile genetic elements, not merely through vertical inheritance. Consequently resistance acquired in agricultural settings can appear subsequently in clinical pathogens sharing no recent ancestry. Stewardship policies addressing human prescribing alone therefore confront only part of the selective pressure.',

  'Superconductivity emerges when electrons form correlated pairs that traverse a lattice without dissipating energy. Conventional materials require temperatures near absolute zero, restricting applications to specialised infrastructure. Compounds superconducting at substantially higher temperatures remain incompletely explained, and predicting new candidates continues to resist systematic theoretical approaches.',

  'Plate tectonics unified observations previously considered unrelated, including earthquake distribution, mountain formation and biogeographical similarities across separated continents. Resistance persisted for decades primarily because no plausible mechanism could move continental masses. Seafloor spreading supplied that mechanism and the framework was accepted remarkably quickly afterward.',

  'Nuclear waste management confronts timescales exceeding recorded human history by several orders of magnitude. Engineering solutions must therefore assume institutional discontinuity, functioning without maintenance, monitoring or comprehensible warning. Geological disposal addresses this by relying on stable formations rather than on continuing administrative competence.',

  'Biodiversity measurements depend substantially on the spatial scale at which sampling occurs. Communities appearing homogeneous across a region frequently reveal considerable local differentiation once resolution increases. Comparative statements about relative richness consequently require explicit methodological specification before they can be meaningfully evaluated.',

  'Rapid urbanisation concentrates infrastructure demand faster than municipal financing mechanisms typically accommodate. Informal settlement expands into whatever space remains, subsequently requiring retrofitted services at considerably higher cost. Planning frameworks anticipating growth outperform those responding to it, though anticipatory investment remains politically difficult to justify.',

  'Demographic transition describes the shift from high mortality and fertility toward substantially lower levels of both. The intervening period produces temporary population expansion as declining deaths precede declining births. Societies experiencing this transition encounter characteristic pressures on employment, education and eventually on pension sustainability.',

  'Archaeological dating techniques each carry systematic limitations requiring cross validation. Radiocarbon measurement assumes atmospheric concentrations that demonstrably fluctuated, necessitating calibration against independently dated sequences. Stratigraphic relationships establish relative ordering reliably while providing no absolute chronology whatsoever without additional physical measurement.',

  'Thermodynamic irreversibility arises statistically rather than from any asymmetry in underlying mechanical laws. Microscopic dynamics remain time symmetric while overwhelmingly probable macroscopic evolution proceeds toward configurations of higher entropy. Reconciling these descriptions requires assumptions about initial conditions that continue to generate substantial theoretical discussion.',

  'Industrial catalysis reduces activation energy without being consumed, permitting reactions at temperatures and pressures otherwise commercially impractical. Surface structure determines activity far more than bulk composition, so preparation methods matter enormously. Deactivation through poisoning or sintering ultimately limits operational lifetime regardless of theoretical performance.',

  'Viral evolution proceeds rapidly because replication generates enormous populations with substantial mutation rates. Selection consequently operates on variation produced continuously rather than occasionally. Surveillance programmes track emerging lineages specifically to identify substitutions affecting transmissibility or immune recognition before they become epidemiologically dominant.',

  'Optical resolution is fundamentally limited by diffraction, establishing a boundary that better manufacturing cannot overcome. Techniques circumventing this limitation exploit fluorescence behaviour rather than improving conventional imaging, reconstructing positions computationally. The resulting methods transformed cellular biology by revealing structures previously inferred only indirectly.',

  'Polymer characteristics depend on molecular weight distribution substantially more than monomer identity alone. Identical chemistry generates materials ranging from viscous liquids through rigid structural solids, determined by average chain length and branching architecture. Manufacturing consequently concentrates on controlling polymerisation conditions rather than simply purifying constituent ingredients.',

  'Geomagnetic reversals become permanently recorded within volcanic rock cooling through a critical temperature threshold. Preserved magnetic alignment documents repeated polarity changes occurring at irregular intervals throughout geological history. Symmetrical striping identified across oceanic ridges subsequently provided decisive confirmation supporting seafloor spreading hypotheses.',

  'Hydrological modelling must represent processes operating across enormously different timescales simultaneously. Surface runoff responds within hours while groundwater recharge proceeds across decades. Integrating these into a single predictive framework requires numerical approaches that remain computationally demanding despite considerable algorithmic improvement.',

  'Microbiome research demonstrated that resident bacterial communities influence metabolism, immunity and possibly behaviour. Establishing causation remains methodologically challenging because composition correlates with diet, medication and host genetics simultaneously. Experimental transfer between animals provides stronger evidence, though extrapolation to humans requires considerable caution.',

  'Spectroscopic identification relies on transitions occurring at characteristic frequencies determined by molecular structure. Because these frequencies are essentially unique, composition can be determined remotely without physical sampling. Astronomical application extended chemistry beyond terrestrial laboratories, establishing that identical elements constitute distant objects entirely inaccessible to direct investigation.',

  'Computational complexity classifies problems by how resource requirements scale with input size rather than by absolute difficulty. Problems tractable in principle remain practically impossible once instances grow beyond modest dimensions. Algorithm design consequently concentrates on approximation and heuristics wherever exact solution demonstrably scales unacceptably.',

  'Evolutionary explanation requires demonstrating heritable variation affecting reproductive success, not merely identifying apparent functionality. Structures may persist as developmental byproducts, historical constraints or consequences of selection on correlated traits. Rigorous accounts therefore distinguish adaptation from characteristics that merely appear purposeful under casual inspection.',

  'Remote sensing infers surface conditions from reflected electromagnetic radiation across multiple wavelengths simultaneously. Vegetation, moisture and mineralogy each produce distinguishable signatures, permitting classification across areas impossible to survey directly. Atmospheric interference nevertheless requires correction procedures that introduce their own systematic uncertainties into resulting measurements.',
]
