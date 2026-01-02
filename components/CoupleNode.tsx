import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { RenderNode } from '../types';
import { getGroupColor } from '../utils/colors';
import { useFamilyStore } from '../store/familyStore';
import { useIsMobile } from '../hooks/useIsMobile';
// RusticTwigDivider ya no se usa aquí

interface CoupleNodeData {
  person1: RenderNode;
  person2: RenderNode;
  coupleId: string;
}

const PersonAvatar = ({ person, onClick, isFocus, compact = false, isRustic = false, textCase = 'capitalize', nameFontSize = 10, surnamesFontSize = 9 }: { person: RenderNode; onClick: () => void; isFocus: boolean; compact?: boolean; isRustic?: boolean; textCase?: 'uppercase' | 'capitalize'; nameFontSize?: number; surnamesFontSize?: number }) => {
  const colors = getGroupColor(person.surnames);
  const initials = person.name.substring(0, 2).toUpperCase();

  const getRelationLabel = (type: string, gender: string) => {
    const ancestorMatch = /^Ancestor(\d+)$/.exec(type);
    if (ancestorMatch) {
      const depth = parseInt(ancestorMatch[1], 10);
      if (depth === 3) return gender === 'Male' ? 'BISABUELO' : 'BISABUELA';
      if (depth === 4) return gender === 'Male' ? 'TATARABUELO' : 'TATARABUELA';
      if (depth >= 5) {
        const x = depth - 3;
        return `${gender === 'Male' ? 'TATARABUELO' : 'TATARABUELA'} x${x}`;
      }
    }
    const descendantMatch = /^Descendant(\d+)$/.exec(type);
    if (descendantMatch) {
      const depth = parseInt(descendantMatch[1], 10);
      if (depth === 3) return gender === 'Male' ? 'BISNIETO' : 'BISNIETA';
      if (depth === 4) return gender === 'Male' ? 'TATARANIETO' : 'TATARANIETA';
      if (depth >= 5) {
        const x = depth - 3;
        return `${gender === 'Male' ? 'TATARANIETO' : 'TATARANIETA'} x${x}`;
      }
    }
    switch (type) {
      case 'Focus': return '';
      case 'Parent': return gender === 'Male' ? 'PADRE' : 'MADRE';
      case 'Partner': return 'PAREJA';
      case 'ChildPartner': return gender === 'Male' ? 'YERNO' : 'NUERA';
      case 'CoInLaw': return gender === 'Male' ? 'CONSUEGRO' : 'CONSUEGRA';
      case 'ChildPartnerSibling': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'ChildPartnerSiblingPartner': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'ChildPartnerSiblingChild': return gender === 'Male' ? 'SOBRINO POL.' : 'SOBRINA POL.';
      case 'Child': return gender === 'Male' ? 'HIJO' : 'HIJA';
      case 'Sibling': return gender === 'Male' ? 'HERMANO' : 'HERMANA';
      case 'SiblingPartner': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'PartnerSibling': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'Uncle/Aunt': return gender === 'Male' ? 'TÍO' : 'TÍA';
      case 'UnclePartner': return gender === 'Male' ? 'TÍO POL.' : 'TÍA POL.';
      case 'Grandparent': return gender === 'Male' ? 'ABUELO' : 'ABUELA';
      case 'Grandchild': return gender === 'Male' ? 'NIETO' : 'NIETA';
      case 'Cousin': return gender === 'Male' ? 'PRIMO' : 'PRIMA';
      case 'CousinPartner': return gender === 'Male' ? 'PRIMO POL.' : 'PRIMA POL.';
      case 'Nephew/Niece': return gender === 'Male' ? 'SOBRINO' : 'SOBRINA';
      case 'InLaw': return gender === 'Male' ? 'SUEGRO' : 'SUEGRA';
      case 'InLawPartner': return gender === 'Male' ? 'SUEGRO' : 'SUEGRA';
      case 'CousinChild': return gender === 'Male' ? 'SOB. 2º' : 'SOB. 2ª';
      default: return type;
    }
  };

  const relationLabel = isFocus ? 'YO' : getRelationLabel(person.relationType, person.gender);

  // Función para formatear texto según textCase
  const formatText = (text: string) => {
    if (textCase === 'uppercase') {
      return text.toUpperCase();
    }
    // capitalize: primera letra de cada palabra en mayúscula
    // Usar split/map para manejar correctamente caracteres españoles (ñ, acentos)
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ============ ESTILO RÚSTICO ============
  if (isRustic) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="flex flex-1 min-w-0 flex-col items-center justify-start cursor-pointer transition-all duration-200 py-1 px-1 hover:opacity-80 w-[100px]"
      >
        {/* Nombre */}
        <h3 
          className="node-name text-center whitespace-nowrap"
          style={{ fontSize: `${nameFontSize}px` }}
        >
          {formatText(person.name)}
        </h3>
        
        {/* Línea divisoria simple y fina */}
        <div className="w-full my-0.5">
          <div className="w-full h-[0.5px]" style={{ backgroundColor: 'var(--rustic-ink, #2c1810)' }} />
        </div>
        
        {/* Apellidos - cada uno en su línea */}
        <div className="flex flex-col items-center">
          {person.surnames.split(' ').map((surname, idx) => (
            <p 
              key={idx}
              className="node-surnames text-center whitespace-nowrap leading-tight"
              style={{ fontSize: `${surnamesFontSize}px` }}
            >
              {formatText(surname)}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // ============ ESTILO MODERNO ============
  // Versión compacta para móvil
  if (compact) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{
          background: isFocus ? 'var(--background-200)' : 'transparent'
        }}
        className={`
          flex flex-1 min-w-0 flex-col items-center p-1.5 rounded-lg cursor-pointer transition-all duration-200
          ${isFocus ? 'scale-105' : 'hover:opacity-80'}
        `}
      >
        {person.photo ? (
          <div
            style={{
              borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
              boxShadow: isFocus ? '0 0 10px rgba(104, 144, 156, 0.4)' : undefined
            }}
            className="w-8 h-8 rounded-full overflow-hidden shadow-md ring-2 transition-all duration-200"
          >
            <img src={person.photo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${colors.bg} ${colors.text} ring-2 transition-all duration-200`}
            style={{
              borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
              boxShadow: isFocus ? '0 0 10px rgba(104, 144, 156, 0.4)' : undefined
            }}
          >
            {initials}
          </div>
        )}
        <span
          style={{ color: isFocus ? 'var(--accent-highlight)' : 'var(--app-text-subtle)' }}
          className="text-[8px] font-semibold tracking-wide mt-1"
        >
          {isFocus ? 'YO' : getRelationLabel(person.relationType, person.gender)}
        </span>
        <div className="flex flex-col items-center mt-0.5 w-full px-1">
          <h3 
            style={{ color: 'var(--app-text)', textTransform: textCase === 'uppercase' ? 'uppercase' : 'capitalize' }} 
            className="text-[10px] font-semibold leading-tight text-center break-words w-full"
          >
            {person.name}
          </h3>
          <p 
            style={{ color: 'var(--app-text-muted)', textTransform: textCase === 'uppercase' ? 'uppercase' : 'capitalize' }} 
            className="text-[8px] text-center leading-tight mt-0.5 break-words w-full"
          >
            {person.surnames}
          </p>
        </div>
      </div>
    );
  }

  // Versión normal para desktop
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: isFocus ? 'var(--background-200)' : 'transparent'
      }}
      className={`
        flex flex-1 min-w-0 flex-col items-center p-3 rounded-2xl cursor-pointer transition-all duration-200
        ${isFocus ? 'scale-105' : 'hover:opacity-80'}
      `}
    >
      {person.photo ? (
        <div
          style={{
            borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
            boxShadow: isFocus ? '0 0 12px rgba(104, 144, 156, 0.4)' : undefined
          }}
          className="w-11 h-11 rounded-full overflow-hidden shadow-lg ring-[3px] transition-all duration-200"
        >
          <img src={person.photo} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shadow-lg ${colors.bg} ${colors.text} ring-[3px] transition-all duration-200`}
          style={{
            borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
            boxShadow: isFocus ? '0 0 12px rgba(104, 144, 156, 0.4)' : undefined
          }}
        >
          {initials}
        </div>
      )}
      <span
        style={{ color: isFocus ? 'var(--accent-highlight)' : 'var(--app-text-subtle)' }}
        className="text-[9px] font-semibold tracking-wider mt-2"
      >
        {isFocus ? 'YO' : getRelationLabel(person.relationType, person.gender)}
      </span>
      <div className="flex flex-col items-center mt-1 w-full px-1">
        <h3 style={{ color: 'var(--app-text)' }} className="text-[12px] font-bold leading-tight text-center break-words w-full">{person.name}</h3>
        <p style={{ color: 'var(--app-text-muted)' }} className="text-[10px] text-center leading-normal mt-0.5 break-words w-full">{person.surnames}</p>
      </div>
    </div>
  );
};

export const CoupleNode = memo(({ data }: { data: CoupleNodeData }) => {
  const setFocusId = useFamilyStore(state => state.setFocusId);
  const focusId = useFamilyStore(state => state.focusId);
  const visualTheme = useFamilyStore(state => state.visualTheme);
  const textCase = useFamilyStore(state => state.textCase);
  const people = useFamilyStore(state => state.people);
  const isMobile = useIsMobile();
  const isRustic = visualTheme === 'rustic';

  const { person1, person2 } = data;
  const isFocus1 = person1.id === focusId;
  const isFocus2 = person2.id === focusId;
  const hasAnyFocus = isFocus1 || isFocus2;

  // Función para formatear texto según textCase
  const formatTextForCalc = (text: string) => {
    if (textCase === 'uppercase') {
      return text.toUpperCase();
    }
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Calcular tamaño de fuente dinámico basado en el texto más largo (para couple: mismo ancho que individual)
  const getRusticFontSizes = () => {
    let maxNameLen = 0;
    let maxSurnamesLen = 0;
    for (const p of people) {
      const formattedName = formatTextForCalc(p.name);
      const formattedSurnames = formatTextForCalc(p.surnames);
      if (formattedName.length > maxNameLen) maxNameLen = formattedName.length;
      if (formattedSurnames.length > maxSurnamesLen) maxSurnamesLen = formattedSurnames.length;
    }
    
    // Ancho de cada mitad del couple node (ajustado para dejar espacio a los anillos)
    const boxWidth = 100;
    const charWidthRatioName = 0.65;
    const charWidthRatioSurnames = 0.55;
    
    const nameFontSize = Math.min(13, Math.max(7, Math.floor(boxWidth / (maxNameLen * charWidthRatioName))));
    const surnamesFontSize = Math.min(11, Math.max(6, Math.floor(boxWidth / (maxSurnamesLen * charWidthRatioSurnames))));
    
    return { nameFontSize, surnamesFontSize };
  };

  // ============ TEMA RÚSTICO ============
  if (isRustic) {
    const { nameFontSize, surnamesFontSize } = getRusticFontSizes();
    
    return (
      <div
        className="rustic-couple-node relative flex items-start justify-center cursor-pointer py-2 px-2 w-[240px]"
      >
        <Handle
          type="target"
          position={Position.Top}
          id={`top-${person1.id}`}
          className="!bg-transparent !border-none"
          style={{ left: '25%' }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id={`top-${person2.id}`}
          className="!bg-transparent !border-none"
          style={{ left: '75%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-transparent !border-none"
          style={{ left: '50%' }}
        />

        <PersonAvatar person={person1} onClick={() => setFocusId(person1.id)} isFocus={isFocus1} compact={isMobile} isRustic={true} textCase={textCase} nameFontSize={nameFontSize} surnamesFontSize={surnamesFontSize} />

        {/* Símbolo de anillos de boda - negro, a la altura de la línea divisoria */}
        <div className="flex items-start justify-center mx-0.5" style={{ minWidth: '24px', paddingTop: `${nameFontSize + 4}px` }}>
          <svg width="20" height="16" viewBox="0 0 1140 912" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill="#2c1810" d="M 377.88 240.82 C 427.00 231.89 478.48 232.71 526.46 247.28 C 541.82 252.00 556.76 258.14 570.82 265.92 C 605.57 245.62 645.97 236.47 685.95 235.32 C 736.22 233.88 786.45 244.80 832.57 264.56 C 888.13 288.48 938.58 325.57 975.20 373.98 C 998.35 404.86 1015.87 440.65 1021.95 478.99 C 1024.09 490.89 1024.01 502.98 1023.90 515.01 C 1022.61 555.77 1004.11 595.50 974.10 623.05 C 958.73 637.51 940.55 648.76 921.25 657.19 C 897.08 667.62 871.12 673.65 844.93 675.94 C 775.79 681.84 705.84 663.95 645.53 630.35 C 619.30 615.68 594.72 597.95 572.98 577.17 C 542.95 603.51 508.20 624.27 471.20 639.23 C 427.74 656.75 380.98 666.51 334.06 666.34 C 291.11 666.15 247.62 657.64 209.34 637.68 C 180.12 622.52 154.34 600.00 137.58 571.48 C 126.60 552.73 119.61 531.66 117.24 510.07 C 114.09 482.65 118.50 454.69 128.05 428.90 C 140.71 394.76 162.13 364.40 187.61 338.61 C 238.98 287.43 306.85 254.08 377.88 240.82 M 367.60 251.29 C 331.25 258.88 296.09 272.33 264.07 291.16 C 232.64 309.80 204.08 333.86 182.35 363.37 C 164.54 387.82 151.26 416.41 148.74 446.84 C 146.58 471.25 152.22 496.46 165.40 517.19 C 167.16 495.18 173.86 473.71 184.19 454.23 C 197.65 428.71 216.60 406.40 238.09 387.28 C 278.74 351.68 328.65 327.25 381.10 314.74 C 425.81 304.23 473.15 302.43 517.93 313.52 C 527.30 300.50 538.49 288.81 551.24 279.07 C 535.91 268.35 518.76 260.40 500.89 254.94 C 457.77 241.93 411.48 242.30 367.60 251.29 M 658.47 251.68 C 628.53 258.48 599.30 272.41 578.51 295.50 C 565.55 309.64 556.54 327.18 552.15 345.83 C 583.45 318.71 625.27 306.86 666.01 305.02 C 711.51 303.00 757.11 312.60 799.03 330.05 C 835.08 345.13 868.74 366.14 897.48 392.67 C 916.56 410.39 933.56 430.54 946.66 453.10 C 962.67 480.17 972.76 511.30 972.20 542.96 C 989.41 520.76 997.16 491.91 994.97 464.04 C 992.85 434.04 981.06 405.42 964.66 380.46 C 947.18 353.82 924.41 330.88 898.98 311.80 C 868.06 288.77 833.13 271.20 796.33 259.78 C 751.96 246.19 704.05 241.52 658.47 251.68 M 624.87 252.13 C 611.94 255.66 599.29 260.31 587.27 266.24 C 557.96 280.37 532.21 302.69 516.17 331.20 C 504.33 352.12 498.01 375.99 497.30 399.98 C 496.16 439.19 509.09 477.73 529.29 510.98 C 544.96 497.77 558.90 482.59 570.93 466.00 C 560.00 449.13 551.58 430.55 546.41 411.11 C 540.74 390.62 539.51 368.80 543.55 347.90 C 547.04 331.08 553.83 314.91 563.83 300.91 C 575.38 284.78 590.84 271.63 608.16 262.03 C 617.81 256.87 627.79 251.90 638.49 249.41 C 633.80 249.34 629.35 250.97 624.87 252.13 M 524.48 255.59 C 528.77 256.47 532.49 258.88 536.40 260.72 C 543.94 264.58 551.16 269.05 558.00 274.06 C 559.64 272.96 561.29 271.87 562.95 270.80 C 552.01 264.95 540.45 260.36 528.74 256.27 C 527.37 255.77 525.90 255.73 524.48 255.59 M 630.27 317.60 C 649.77 344.11 660.21 377.12 659.75 410.01 C 659.75 448.29 645.88 485.50 625.21 517.33 C 638.23 529.04 652.37 539.48 667.17 548.83 C 703.46 571.52 743.94 587.71 786.11 595.22 C 821.61 601.45 858.59 601.60 893.57 592.28 C 919.50 585.31 944.59 572.79 963.31 553.21 C 964.92 541.82 964.18 530.22 962.52 518.86 C 958.33 491.50 946.40 465.87 930.96 443.09 C 915.01 419.87 895.10 399.52 872.94 382.18 C 839.65 356.34 801.43 336.93 761.02 325.02 C 718.83 312.72 673.51 308.34 630.27 317.60 M 389.88 320.90 C 335.05 332.88 282.61 357.91 240.73 395.55 C 222.81 411.94 206.76 430.59 194.75 451.77 C 181.37 474.83 172.83 501.26 173.30 528.10 C 192.13 552.23 220.02 567.85 248.87 576.94 C 292.02 590.29 338.50 590.11 382.52 581.21 C 425.62 572.34 467.14 555.31 503.61 530.61 C 510.20 525.94 517.07 521.40 523.01 515.99 C 508.79 492.88 498.22 467.44 492.73 440.83 C 487.95 416.88 487.77 391.88 493.32 368.04 C 497.47 351.34 503.91 335.08 513.29 320.61 C 472.87 310.93 430.36 312.25 389.88 320.90 M 600.63 326.39 C 612.10 351.96 613.47 381.38 606.73 408.42 C 601.45 430.31 591.12 450.69 578.39 469.16 C 557.86 498.43 530.77 522.70 500.78 541.97 C 464.89 564.89 424.63 580.89 382.88 589.23 C 339.07 597.86 293.01 598.08 249.91 585.60 C 218.56 576.46 188.47 559.85 167.71 534.18 C 151.19 514.26 141.72 488.80 140.38 463.02 C 139.20 436.93 146.16 410.93 157.96 387.79 C 141.45 412.81 129.67 441.27 125.66 471.09 C 122.85 492.25 124.15 514.03 130.23 534.53 C 136.17 555.02 146.91 574.01 160.89 590.08 C 183.95 616.49 215.30 634.66 248.44 645.33 C 290.75 658.99 336.19 661.32 380.08 655.38 C 422.63 649.57 464.07 636.09 502.08 616.15 C 537.14 597.66 569.35 573.37 595.50 543.48 C 620.39 515.04 639.79 481.12 647.99 444.00 C 653.87 416.89 653.24 388.06 644.15 361.72 C 639.15 346.54 631.46 332.34 621.95 319.53 C 614.68 321.23 607.53 323.53 600.63 326.39 M 576.14 338.34 C 585.40 344.49 594.01 351.63 601.78 359.59 C 600.39 349.15 597.55 338.91 593.20 329.32 C 587.38 332.08 581.63 334.98 576.14 338.34 M 550.10 359.19 C 548.33 372.77 549.46 386.66 552.08 400.07 C 556.28 420.88 564.67 440.71 575.75 458.76 C 592.10 433.29 603.41 403.61 602.79 373.00 C 593.21 361.22 581.53 351.23 568.68 343.17 C 562.05 347.95 555.53 353.06 550.10 359.19 M 991.45 414.33 C 1000.36 436.85 1005.19 461.27 1002.82 485.51 C 1000.99 505.06 994.29 524.13 983.65 540.62 C 970.06 561.63 949.83 577.80 927.35 588.47 C 899.25 601.82 867.93 607.31 836.97 607.54 C 795.46 607.74 754.20 598.61 715.88 582.87 C 681.32 568.52 648.73 548.96 620.84 523.93 C 608.69 541.42 594.50 557.42 578.89 571.89 C 594.79 587.00 612.26 600.43 630.73 612.24 C 687.57 648.28 754.41 669.77 821.99 669.21 C 851.38 668.79 880.87 664.08 908.45 653.71 C 931.29 645.04 952.85 632.43 970.48 615.40 C 983.93 602.67 994.78 587.27 1002.65 570.52 C 1014.79 544.29 1018.50 514.57 1014.81 486.01 C 1011.72 460.89 1003.26 436.64 991.45 414.33 Z" />
          </svg>
        </div>

        <PersonAvatar person={person2} onClick={() => setFocusId(person2.id)} isFocus={isFocus2} compact={isMobile} isRustic={true} textCase={textCase} nameFontSize={nameFontSize} surnamesFontSize={surnamesFontSize} />
      </div>
    );
  }

  // ============ TEMA MODERNO (ORIGINAL) ============
  // Versión compacta para móvil
  if (isMobile) {
    return (
      <div
        style={{
          background: 'var(--card-bg)',
          borderColor: hasAnyFocus ? 'var(--accent-highlight)' : 'var(--card-border)',
          boxShadow: hasAnyFocus ? '0 0 20px rgba(104, 144, 156, 0.3)' : undefined
        }}
        className={`
          relative flex w-[200px] h-[130px] items-center gap-0 rounded-xl p-1 border
          transition-all duration-300 ease-out
          ${hasAnyFocus ? 'ring-2' : 'hover:shadow-md'}
          backdrop-blur-xl
        `}
      >
        <Handle
          type="target"
          position={Position.Top}
          id={`top-${person1.id}`}
          className="!bg-transparent !border-none"
          style={{ left: '25%' }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id={`top-${person2.id}`}
          className="!bg-transparent !border-none"
          style={{ left: '75%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-transparent !border-none"
          style={{ left: '50%' }}
        />

        <PersonAvatar person={person1} onClick={() => setFocusId(person1.id)} isFocus={isFocus1} compact textCase={textCase} />

        <div className="flex items-center justify-center px-0 -mx-1 z-10">
          <div
            style={{ background: 'var(--heart-bg)' }}
            className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
          >
            <svg style={{ color: 'var(--heart-color)' }} className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <PersonAvatar person={person2} onClick={() => setFocusId(person2.id)} isFocus={isFocus2} compact textCase={textCase} />
      </div>
    );
  }

  // Versión normal para desktop
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderColor: hasAnyFocus ? 'var(--accent-highlight)' : 'var(--card-border)',
        boxShadow: hasAnyFocus ? '0 0 25px rgba(104, 144, 156, 0.35)' : undefined
      }}
      className={`
        relative flex w-[260px] h-auto items-center gap-0 rounded-[20px] p-1.5 border
        transition-all duration-300 ease-out
        ${hasAnyFocus ? 'ring-2' : 'hover:shadow-lg'}
        backdrop-blur-xl
      `}
    >
      {/* Handles específicos para cada persona en la pareja */}
      <Handle
        type="target"
        position={Position.Top}
        id={`top-${person1.id}`}
        className="!bg-transparent !border-none"
        style={{ left: '25%' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id={`top-${person2.id}`}
        className="!bg-transparent !border-none"
        style={{ left: '75%' }}
      />
      {/* Handle general para hijos (centro) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-none"
        style={{ left: '50%' }}
      />

      <PersonAvatar person={person1} onClick={() => setFocusId(person1.id)} isFocus={isFocus1} textCase={textCase} />

      {/* Heart connector */}
      <div className="flex flex-col items-center justify-center px-0 -mx-2 z-10">
        <div
          style={{ background: 'var(--heart-bg)' }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md"
        >
          <svg style={{ color: 'var(--heart-color)' }} className="w-3.5 h-3.5 transition-colors" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      <PersonAvatar person={person2} onClick={() => setFocusId(person2.id)} isFocus={isFocus2} textCase={textCase} />
    </div>
  );
});

CoupleNode.displayName = 'CoupleNode';
