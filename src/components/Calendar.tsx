'use client';

import bootstrap5 from '@fullcalendar/bootstrap5';
import FullCalendar, {
  EventSourceInput
} from '#components/fullcalendar/nextjs';
import dayGridPlugin from '#components/fullcalendar/nextjs/daygrid';
import timeGridPlugin from '#components/fullcalendar/nextjs/timegrid';

import '@fullcalendar/bootstrap5/theme.css';

import React, { ReactElement } from 'react';
import { Modal } from 'react-bootstrap';

type Properties = { events: EventSourceInput };

export function Calendar(props: Properties) {
  const [modal, setModal] = React.useState<
    | {
        title?: string | ReactElement;
        body?: string | ReactElement;
        footer?: string | ReactElement;
      }
    | undefined
  >(undefined);

  function hideModal() {
    setModal(undefined);
  }

  return (
    <div>
      <FullCalendar
        plugins={[bootstrap5, dayGridPlugin, timeGridPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          start: 'today,prev,next',
          center: 'title',
          end: 'timeGridDay,timeGridWeek,dayGridMonth'
        }}
        eventClick={(info) => {
          const {
            title = info.event.title,
            body = (
              <pre lang="json">
                {JSON.stringify(info.event.extendedProps, null, 2)}
              </pre>
            ),
            footer
          } = info.event.extendedProps.modal || {};
          setModal({ title, body, footer });
        }}
        {...props}
      />
      <Modal show={!!modal} onHide={hideModal}>
        <Modal.Header closeButton>
          <Modal.Title>{modal?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modal?.body}</Modal.Body>
        {modal?.footer ? <Modal.Footer>{modal.footer}</Modal.Footer> : <></>}
      </Modal>
    </div>
  );
}
