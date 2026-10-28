'use client';

import { Spinner } from 'react-bootstrap';

type Properties = { caption?: string };

export function Loading({ caption }: Properties) {
  return (
    <div className="position-absolute top-50 start-50 translate-middle">
      <Spinner style={{ height: '25vh', width: '25vh' }} />
      {!!caption ? <p>{caption}</p> : <></>}
    </div>
  );
}
