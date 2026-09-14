import imgSportsCalf from '../../assets/images/sports_calf_massage_1785522498237.jpg';
import imgDeepTissue from '../../assets/images/deep_tissue_massage_1785522513154.jpg';
import imgPrenatal from '../../assets/images/prenatal_massage_1785522530074.jpg';
import imgCouples from '../../assets/images/couples_massage_1785522546191.jpg';
import imgRelaxing from '../../assets/images/relaxing_massage_1785522575769.jpg';
import imgTension from '../../assets/images/tension_release_massage_1785522590275.jpg';
import imgFourHands from '../../assets/images/four_hands_massage_1785522559896.jpg';
import imgCustomNew from '../../assets/images/regenerated_image_1789415306021.png';

export const STATIC_SERVICE_IMAGES: Record<string, string> = {
  'SRB-relajante': imgCustomNew,
  'srv-relajante': imgCustomNew,
  'srv-descontracturante': imgTension,
  'srv-deportivo': imgSportsCalf,
  'srv-tejido-profundo': imgDeepTissue,
  'srv-prenatal': imgPrenatal,
  'srv-pareja': imgCouples,
  'srv-cuatro-manos': imgFourHands,
};

export const getStaticServiceImageFallback = (idOrName?: string): string => {
  const query = (idOrName || '').toLowerCase();
  if (query.includes('relaj') || query.includes('relax') || query.includes('srb')) return imgCustomNew;
  if (query.includes('descontract') || query.includes('tension') || query.includes('nudos')) return imgTension;
  if (query.includes('deport') || query.includes('sport') || query.includes('atlet')) return imgSportsCalf;
  if (query.includes('profund') || query.includes('deep') || query.includes('tejido')) return imgDeepTissue;
  if (query.includes('prenat') || query.includes('embaraz') || query.includes('gestant')) return imgPrenatal;
  if (query.includes('parej') || query.includes('duo') || query.includes('couple') || query.includes('dos')) return imgCouples;
  if (query.includes('cuatro') || query.includes('four') || query.includes('manos')) return imgFourHands;
  return imgSportsCalf;
};

export const getServiceImage = (
  srv: { id?: string; name?: string; nombre?: string; image?: string; category?: string } | string | null | undefined
): string => {
  if (!srv) return imgCustomNew;

  if (typeof srv === 'string') {
    const trimmed = srv.trim().toLowerCase();
    if (trimmed.includes('relaj') || trimmed.includes('relax') || trimmed.includes('srb')) {
      return imgCustomNew;
    }
    if (
      (srv.trim().startsWith('http://') || srv.trim().startsWith('https://')) &&
      !srv.trim().includes('photo-1512290900672')
    ) {
      return srv.trim();
    }
    if (srv.trim().startsWith('/assets') || srv.trim().startsWith('data:') || srv.trim().startsWith('/@fs')) {
      return srv.trim();
    }
    return STATIC_SERVICE_IMAGES[srv.trim()] || getStaticServiceImageFallback(srv.trim());
  }

  const name = (srv.name || srv.nombre || '').toLowerCase();
  const id = (srv.id || '').toLowerCase();
  const category = (srv.category || '').toLowerCase();

  if (name.includes('relaj') || id.includes('relaj') || category.includes('relaj') || id.includes('srb')) {
    return imgCustomNew;
  }

  // 1. If srv has a valid image string from Firestore or props
  if (
    srv.image &&
    typeof srv.image === 'string' &&
    srv.image.trim().length > 5 &&
    !srv.image.includes('photo-1512290900672') &&
    !srv.image.includes('relaxing')
  ) {
    // If not explicitly relaxing image override, check if name implies relaxing
  }

  // 2. Map directly by ID to local static asset
  if (id && STATIC_SERVICE_IMAGES[id]) {
    return STATIC_SERVICE_IMAGES[id];
  }

  // 3. Fallback by name, category or ID
  const searchKey = srv.name || srv.nombre || srv.category || id;
  return getStaticServiceImageFallback(searchKey);
};

