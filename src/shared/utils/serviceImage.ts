import imgSportsCalf from '../../assets/images/sports_calf_massage_1785522498237.jpg';
import imgDeepTissue from '../../assets/images/deep_tissue_massage_1785522513154.jpg';
import imgPrenatal from '../../assets/images/prenatal_massage_1785522530074.jpg';
import imgCouples from '../../assets/images/couples_massage_1785522546191.jpg';
import imgRelaxing from '../../assets/images/relaxing_massage_1785522575769.jpg';
import imgTension from '../../assets/images/tension_release_massage_1785522590275.jpg';
import imgFourHands from '../../assets/images/four_hands_massage_1785522559896.jpg';

export const STATIC_SERVICE_IMAGES: Record<string, string> = {
  'SRB-relajante': imgRelaxing,
  'srv-relajante': imgRelaxing,
  'srv-descontracturante': imgTension,
  'srv-deportivo': imgSportsCalf,
  'srv-tejido-profundo': imgDeepTissue,
  'srv-prenatal': imgPrenatal,
  'srv-pareja': imgCouples,
  'srv-cuatro-manos': imgFourHands,
};

export const getStaticServiceImageFallback = (idOrName?: string): string => {
  const query = (idOrName || '').toLowerCase();
  if (query.includes('relaj') || query.includes('relax') || query.includes('srb')) return imgRelaxing;
  if (query.includes('descontract') || query.includes('tension') || query.includes('nudos')) return imgTension;
  if (query.includes('deport') || query.includes('sport') || query.includes('atlet')) return imgSportsCalf;
  if (query.includes('profund') || query.includes('deep') || query.includes('tejido')) return imgDeepTissue;
  if (query.includes('prenat') || query.includes('embaraz') || query.includes('gestant')) return imgPrenatal;
  if (query.includes('parej') || query.includes('duo') || query.includes('couple') || query.includes('dos')) return imgCouples;
  if (query.includes('cuatro') || query.includes('four') || query.includes('manos')) return imgFourHands;
  return imgRelaxing;
};

export const getServiceImage = (
  srv: { id?: string; name?: string; nombre?: string; image?: string; category?: string } | string | null | undefined
): string => {
  if (!srv) return imgRelaxing;

  if (typeof srv === 'string') {
    const trimmed = srv.trim();
    if (
      (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
      !trimmed.includes('photo-1512290900672')
    ) {
      return trimmed;
    }
    if (trimmed.startsWith('/assets') || trimmed.startsWith('data:') || trimmed.startsWith('/@fs')) {
      return trimmed;
    }
    return STATIC_SERVICE_IMAGES[trimmed] || getStaticServiceImageFallback(trimmed);
  }

  // 1. If srv has a valid image string from Firestore or props
  if (
    srv.image &&
    typeof srv.image === 'string' &&
    srv.image.trim().length > 5 &&
    !srv.image.includes('photo-1512290900672')
  ) {
    return srv.image.trim();
  }

  // 2. Map directly by ID to local static asset
  const id = srv.id || '';
  if (id && STATIC_SERVICE_IMAGES[id]) {
    return STATIC_SERVICE_IMAGES[id];
  }

  // 3. Fallback by name, category or ID
  const searchKey = srv.name || srv.nombre || srv.category || id;
  return getStaticServiceImageFallback(searchKey);
};

